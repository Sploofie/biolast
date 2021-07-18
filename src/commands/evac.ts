import { Command } from '../types/Commands'
import { messageUser, reply } from '../utils/messageUtils'
import { beginTransaction, query } from '../utils/db/mysql'
import { getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { getRaidType } from '../utils/raidUtils'
import { formatTime } from '../utils/db/cooldowns'
import { getItemDisplay, getItems, sortItemsByDurability } from '../utils/itemUtils'
import { CONFIRM_BUTTONS } from '../utils/constants'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'

const EXTRACTIONS = new Set()

export const command: Command = {
	name: 'evac',
	aliases: ['evacuate', 'escape'],
	examples: [],
	description: 'Use this command in an evac channel to escape from a raid with the loot in your backpack.',
	shortDescription: 'Use this command to evac from a raid.',
	category: 'info',
	permissions: ['sendMessages', 'externalEmojis'],
	cooldown: 2,
	worksInDMs: false,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: true,
	guildModsOnly: false,
	async execute(app, message, { args, prefix }) {
		const raidType = getRaidType(message.channel.guild.id)
		if (!raidType) {
			// raid type not found?? this shouldn't happen so throw error
			throw new Error('Could not find raid type')
		}

		const raidChannel = raidType.channels.find(ch => ch.name === message.channel.name)
		if (!raidChannel) {
			// raid channel not found, was the channel not specified in the location?
			throw new Error('Could not find raid channel')
		}

		if (raidChannel.type !== 'EvacChannel') {
			await reply(message, {
				content: '❌ You can\'t evac from this channel. Look for an evac channel to escape this raid.'
			})
			return
		}

		const userBackpack = await getUserBackpack(query, message.author.id)
		const userBackpackData = getItems(userBackpack)
		const evacNeeded = raidChannel.evac.requiresKey
		const evacItem = sortItemsByDurability(userBackpackData.items, true).find(i => i.item.name === evacNeeded?.name)

		if (evacNeeded && !evacItem) {
			await reply(message, {
				content: `❌ Using this evac requires you to have a ${getItemDisplay(evacNeeded)} in your backpack.`
			})
			return
		}

		const botMessage = await reply(message, {
			content: `Are you sure you want to evac here${evacItem ? ` using your ${getItemDisplay(evacItem.item, evacItem.row)}` : ''}? The escape will take **${formatTime(raidChannel.evac.time * 1000)}**.`,
			components: CONFIRM_BUTTONS
		})

		try {
			const confirmed = (await app.componentCollector.awaitClicks(botMessage.id, i => i.user.id === message.author.id))[0]

			if (confirmed.customID === 'confirmed') {
				if (EXTRACTIONS.has(message.author.id)) {
					await confirmed.editParent({
						content: '❌ You are currently evacuating this raid.',
						components: []
					})
					return
				}

				EXTRACTIONS.add(message.author.id)

				if (evacItem) {
					const transaction = await beginTransaction()
					const userBackpackVerified = await getUserBackpack(transaction.query, message.author.id, true)
					const userBackpackDataVerified = getItems(userBackpackVerified)

					// get the item with the highest durability and use it
					const evacItemVerified = sortItemsByDurability(userBackpackDataVerified.items, true).find(i => i.item.name === evacItem.item.name)

					if (!evacItemVerified) {
						await transaction.commit()

						await confirmed.editParent({
							content: `❌ Using this evac requires you to have a ${getItemDisplay(evacItem.item)} in your backpack.`,
							components: []
						})
						return
					}

					// lower durability or remove item if durability ran out
					if (!evacItemVerified.row.durability || evacItemVerified.row.durability - 1 <= 0) {
						await removeItemFromBackpack(transaction.query, evacItemVerified.row.id)
					}
					else {
						await lowerItemDurability(transaction.query, evacItemVerified.row.id, 1)
					}

					await transaction.commit()
				}

				setTimeout(async () => {
					try {
						const member = message.channel.guild.members.get(message.author.id)

						if (member) {
							await message.channel.createMessage({
								content: `<@${member.id}>, **${formatTime((raidChannel.evac.time - (raidChannel.evac.time / 3)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						console.error(err)
					}
				}, (raidChannel.evac.time / 3) * 1000)

				setTimeout(async () => {
					try {
						const member = message.channel.guild.members.get(message.author.id)

						if (member) {
							await message.channel.createMessage({
								content: `<@${member.id}>, **${formatTime((raidChannel.evac.time - ((raidChannel.evac.time / 3) * 2)) * 1000)}** until extraction!`
							})
						}
					}
					catch (err) {
						console.error(err)
					}
				}, ((raidChannel.evac.time / 3) * 2) * 1000)

				setTimeout(async () => {
					try {
						const member = message.channel.guild.members.get(message.author.id)
						const activeRaid = app.activeRaids.find(raid => raid.userID === message.author.id)
						const userRaid = await getUsersRaid(query, message.author.id)

						if (member && activeRaid && userRaid) {
							const userBackpackV = await getUserBackpack(query, message.author.id)
							const userBackpackDataV = getItems(userBackpackV)

							clearTimeout(activeRaid.timeout)
							await removeUserFromRaid(query, message.author.id)

							try {
								await member.kick('User evacuated')

								await messageUser(member.user, {
									content: `✅ **${raidType.display}** raid successful!\n\n` +
										`You spent a total of **${formatTime(Date.now() - userRaid.startedAt.getTime())}** in raid and managed to evac with **${userBackpackDataV.items.length}** items in your backpack.`
								})
							}
							catch (err) {
								console.error(err)
							}
						}
					}
					catch (err) {
						console.error(err)
					}
				}, raidChannel.evac.time * 1000)

				await confirmed.editParent({
					content: `✅ Escaping this raid in **${formatTime(raidChannel.evac.time * 1000)}**. Try not to die in that time.`,
					components: []
				})
			}
			else {
				await botMessage.delete()
			}
		}
		catch (err) {
			await botMessage.edit({
				content: '❌ Command timed out.',
				components: []
			})
		}
	}
}
