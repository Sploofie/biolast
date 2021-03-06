import { CommandOptionType, SlashCreator, CommandContext, User } from 'slash-create'
import { ResolvedMember } from 'slash-create/lib/structures/resolvedMember'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { BackpackItemRow, CompanionRow, ItemRow, UserRow } from '../types/mysql'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { combineArrayWithAnd, formatHealth, formatMoney, formatNumber, formatXP } from '../utils/stringUtils'
import { getPlayerXp } from '../utils/playerUtils'
import { getItemPrice, getItems } from '../utils/itemUtils'
import { getUserBackpack, getUserStash } from '../utils/db/items'
import { allLocations, isValidLocation, locations } from '../resources/locations'
import { getCompanionRow } from '../utils/db/companions'
import { companions } from '../resources/companions'
import { getCompanionDisplay } from '../utils/companionUtils'

class ProfileCommand extends CustomSlashCommand<'profile'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'profile',
			description: 'View your player statistics.',
			longDescription: 'View your player statistics.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check profile of.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
			guildIDs: [],
			starterTip: 'You can view player stats and other information about yourself or another player by viewing their profile.'
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const member = ctx.members.get(ctx.options.user)

		if (member) {
			const userData = await getUserRow(query, member.id)

			if (!userData) {
				await ctx.send({
					content: `${icons.warning} **${member.displayName}** does not have an account!`
				})
				return
			}

			const backpackRows = await getUserBackpack(query, member.id)
			const stashRows = await getUserStash(query, member.id)
			const companionRow = await getCompanionRow(query, member.id)
			const profileEmb = this.getProfileEmbed(member, userData, backpackRows, stashRows, companionRow)

			await ctx.send({
				embeds: [profileEmb.embed]
			})
			return
		}

		const backpackRows = await getUserBackpack(query, ctx.user.id)
		const stashRows = await getUserStash(query, ctx.user.id)
		const userData = (await getUserRow(query, ctx.user.id))!
		const companionRow = await getCompanionRow(query, ctx.user.id)
		const profileEmb = this.getProfileEmbed(ctx.member || ctx.user, userData, backpackRows, stashRows, companionRow)

		await ctx.send({
			embeds: [profileEmb.embed]
		})
	}

	getProfileEmbed (member: ResolvedMember | User, userData: UserRow, backpackRows: BackpackItemRow[], stashRows: ItemRow[], companionRow?: CompanionRow): Embed {
		const userDisplay = 'user' in member ? member.displayName : `${member.username}#${member.discriminator}`
		const playerXp = getPlayerXp(userData.xp, userData.level)
		const totalKills = userData.kills + userData.npcKills + userData.bossKills
		const kdRatio = totalKills / (userData.deaths || 1)
		const backpackData = getItems(backpackRows)
		const stashData = getItems(stashRows)
		const playerValue = backpackData.items.reduce((prev, curr) => prev + Math.floor(getItemPrice(curr.item, curr.row) * this.app.currentShopSellMultiplier), 0) +
			stashData.items.reduce((prev, curr) => prev + Math.floor(getItemPrice(curr.item, curr.row) * this.app.currentShopSellMultiplier), 0) +
			userData.money
		const currentLocation = isValidLocation(userData.currentLocation) ? locations[userData.currentLocation] : undefined
		const maxLocations = allLocations.filter(l => l.locationLevel === userData.locationLevel) || allLocations.filter(l => l.locationLevel === userData.locationLevel - 1)
		const companion = companions.find(c => c.name === companionRow?.type)

		const embed = new Embed()
			.setAuthor(`${userDisplay}'s Profile`, member.avatarURL)
			.setThumbnail(member.avatarURL)
			.addField('__Health__', `**${userData.health} / ${userData.maxHealth}**\n${formatHealth(userData.health, userData.maxHealth)}`, true)
			.addField('__Experience__', `**Lvl. ${userData.level}** ${formatXP(playerXp.relativeLevelXp, playerXp.levelTotalXpNeeded)}\n${formatNumber(playerXp.relativeLevelXp)} / ${formatNumber(playerXp.levelTotalXpNeeded)} XP`, true)
			.addField('__Balance__', `**${formatMoney(userData.money)}** copper`, true)

		if (companionRow && companion) {
			embed.addField('__Companion__', `${companion.icon} ${getCompanionDisplay(companion, companionRow)} (Lvl. **${companionRow.level}**)`, true)
		}

		embed.addField('__Stats__', `**Highest Tier Region**: ${maxLocations.length ? combineArrayWithAnd(maxLocations.map(l => `${l.icon} ${l.display}`)) : 'Unknown...'} (Region Tier **${userData.locationLevel}**)` +
				`\n**Player Kills**: ${formatNumber(userData.kills)}\n**Mob Kills (bosses count)**: ${formatNumber(userData.npcKills)}` +
				`\n**Boss Kills**: ${formatNumber(userData.bossKills)}\n**Deaths**: ${formatNumber(userData.deaths)} (${formatNumber(kdRatio, true)} K/D ratio)` +
				`\n**Quests Completed**: ${formatNumber(userData.questsCompleted)}\n**Player Value**: ${formatMoney(playerValue)}`)

		if (currentLocation) {
			embed.setDescription(`Currently scavenging ${currentLocation.icon} **${currentLocation.display}** (Tier **${currentLocation.locationLevel}** Region)`)
		}

		return embed
	}
}

export default ProfileCommand
