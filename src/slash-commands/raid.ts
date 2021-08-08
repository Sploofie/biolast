import { CommandOptionType, SlashCreator, CommandContext, Message, InteractionResponseFlags } from 'slash-create'
import App from '../app'
import { allLocations } from '../resources/raids'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { formatTime } from '../utils/db/cooldowns'
import { getUserBackpack } from '../utils/db/items'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { addUserToRaid, getAllUsers, getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import { isRaidGuild } from '../utils/raidUtils'

class RaidCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'raid',
			description: 'Used to join a raid. Raids are where you go to scavenge for loot and fight other players.',
			longDescription: 'Used to join a raid. Raids are where you go to scavenge for loot and fight other players.' +
				' You will take everything in your inventory with you, and if you die you will lose all the items you took (your stash remains unaffected).' +
				' **This command will send you a server invite link. The server IS the raid.** Raids take place in a separate server so you can be matched against other random players.',
			options: [
				{
					type: CommandOptionType.STRING,
					name: 'location',
					description: 'Location to raid.',
					required: false,
					choices: allLocations.map(loc => ({
						name: `${loc.display} - Level Required: ${loc.requirements.level}`,
						value: loc.id
					}))
				}
			],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			onlyWorksInRaidGuild: false,
			canBeUsedInRaid: true,
			guildIDs: [],
			deferEphemeral: true
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const isInRaid = await getUsersRaid(query, ctx.user.id)
		const userData = (await getUserRow(query, ctx.user.id))!

		if (isRaidGuild(ctx.guildID)) {
			await ctx.send({
				content: '❌ You are in a raid right now!! 🤔',
				flags: InteractionResponseFlags.EPHEMERAL
			})
			return
		}
		else if (isInRaid) {
			const botMessage = await ctx.send({
				content: '⚠️ You are already in a raid. Are you looking for the invite link?',
				flags: InteractionResponseFlags.EPHEMERAL,
				components: CONFIRM_BUTTONS
			}) as Message

			try {
				const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

				if (confirmed.customID === 'confirmed') {
					await confirmed.editParent({
						content: `✅ Click here to join the raid: https://discord.gg/${isInRaid.invite}\n\n` +
							'⚠️ This is not an advertisement, this server is temporary and is designed strictly for the game.',
						components: []
					})
				}
				else {
					await confirmed.editParent({
						content: '✅ Canceled.',
						components: []
					})
				}
			}
			catch (err) {
				await ctx.editOriginal({
					content: '❌ Command timed out.',
					components: []
				})
			}

			return
		}

		const choice = allLocations.find(loc => loc.id === ctx.options.location)

		if (!choice) {
			await ctx.send({
				content: '❌ You need to specify a location you want to raid. The following locations are available:',
				flags: InteractionResponseFlags.EPHEMERAL,
				embeds: [this.getLocationsEmbed().embed]
			})
			return
		}
		else if (choice.requirements.level > userData.level) {
			await ctx.send({
				content: `❌ You are not a high enough level to explore that location. Level required: **${choice.requirements.level}**`,
				flags: InteractionResponseFlags.EPHEMERAL
			})
			return
		}

		const botMessage = await ctx.send({
			content: `Join a raid in **${choice.display}**? The raid will last **${formatTime(choice.raidLength * 1000)}**.`,
			flags: InteractionResponseFlags.EPHEMERAL,
			components: CONFIRM_BUTTONS
		}) as Message

		try {
			const confirmed = (await this.app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === ctx.user.id))[0]

			if (confirmed.customID === 'confirmed') {
				// using transaction because users data will be updated
				const transaction = await beginTransaction()
				const userRaid = await getUsersRaid(transaction.query, ctx.user.id, true)
				let raidGuildID

				if (userRaid) {
					await transaction.commit()

					await confirmed.editParent({
						content: '❌ You are already in an active raid!',
						components: []
					})
					return
				}

				// find a raid with room for players
				for (const id of choice.guilds) {
					const players = await getAllUsers(transaction.query, id)

					if (players.length <= choice.playerLimit) {
						raidGuildID = id
					}
				}

				// a raid with room for players was not found
				if (!raidGuildID) {
					await transaction.commit()

					await confirmed.editParent({
						content: `❌ All of the **${choice.display}** raids are full! Try again in 5 - 10 minutes after some players have left the raid.`,
						components: []
					})
					return
				}

				const raidGuild = this.app.bot.guilds.get(raidGuildID)

				if (!raidGuild) {
					await transaction.commit()

					throw new Error('Could not find raid guild')
				}

				const inviteChannel = raidGuild.channels.find(ch => ch.name === 'welcome')

				if (!inviteChannel) {
					await transaction.commit()

					throw new Error(`Could not find welcome channel in guild: ${raidGuild.id}`)
				}

				const invite = await this.app.bot.createChannelInvite(inviteChannel.id, { maxAge: choice.raidLength }, `${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) started raid`)

				await addUserToRaid(transaction.query, ctx.user.id, raidGuild.id, invite.code, choice.raidLength)
				await transaction.commit()

				this.app.activeRaids.push({
					userID: ctx.user.id,
					timeout: setTimeout(async () => {
						try {
							const expiredTransaction = await beginTransaction()
							await getUsersRaid(expiredTransaction.query, ctx.user.id, true)
							await getUserBackpack(expiredTransaction.query, ctx.user.id, true)
							await removeUserFromRaid(expiredTransaction.query, ctx.user.id)

							// remove items from backpack since user didn't evac
							await expiredTransaction.query('DELETE items FROM items INNER JOIN backpack_items ON items.id = backpack_items.itemId WHERE userId = ?', [ctx.user.id])
							await expiredTransaction.commit()

							await this.app.bot.kickGuildMember(raidGuild.id, ctx.user.id, 'Raid time ran out')
						}
						catch (err) {
							// unable to kick user?
						}
					}, choice.raidLength * 1000)
				})

				await confirmed.editParent({
					content: `✅ **${choice.display} raid started!** You have **${formatTime(choice.raidLength * 1000)}** to join this raid and evac with whatever loot you can find.` +
						` **You can use \`/raidtime\` in the raid to view how much time you have left.**\n\nClick here to join the raid: https://discord.gg/${invite.code}\n\n` +
						'⚠️ This is not an advertisement, this server is temporary and is designed strictly for the game.',
					components: []
				})
			}
			else {
				await confirmed.editParent({
					content: '✅ Canceled.',
					components: []
				})
			}
		}
		catch (err) {
			await ctx.editOriginal({
				content: '❌ Command timed out.',
				components: []
			})
		}
	}

	getLocationsEmbed (): Embed {
		const locationsEmb = new Embed()
			.setTitle('Available Locations')
			.setDescription('The bot is in early access, expect more locations to be added.')

		for (const loc of allLocations) {
			locationsEmb.addField(loc.display, `Level Required: **${loc.requirements.level}**\nMax Players: **${loc.playerLimit}**\nRaid Time: **${formatTime(loc.raidLength * 1000)}**`)
		}

		return locationsEmb
	}
}

export default RaidCommand