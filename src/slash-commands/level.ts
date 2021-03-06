import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import { query } from '../utils/db/mysql'
import { getUserRow } from '../utils/db/players'
import { getPlayerXp } from '../utils/playerUtils'
import { formatNumber, formatXP } from '../utils/stringUtils'

class LevelCommand extends CustomSlashCommand<'level'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'level',
			description: 'View your current xp and level.',
			longDescription: 'View your current xp and level.',
			options: [{
				type: CommandOptionType.USER,
				name: 'user',
				description: 'User to check level of.',
				required: false
			}],
			category: 'info',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
			guildIDs: []
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

			const playerXp = getPlayerXp(userData.xp, userData.level)

			await ctx.send({
				content: `**${member.displayName}** is currently **Lvl. ${userData.level}** ${formatXP(playerXp.relativeLevelXp, playerXp.levelTotalXpNeeded)}` +
					` ${formatNumber(playerXp.relativeLevelXp)} / ${formatNumber(playerXp.levelTotalXpNeeded)} XP`
			})
			return
		}

		const userData = (await getUserRow(query, ctx.user.id))!
		const playerXp = getPlayerXp(userData.xp, userData.level)

		await ctx.send({
			content: `You are currently **Lvl. ${userData.level}** ${formatXP(playerXp.relativeLevelXp, playerXp.levelTotalXpNeeded)}` +
				` ${formatNumber(playerXp.relativeLevelXp)} / ${formatNumber(playerXp.levelTotalXpNeeded)} XP`
		})
	}
}

export default LevelCommand
