import { Command } from '../types/Commands'
import { reply } from '../utils/messageUtils'
import Embed from '../structures/Embed'
import { inspect } from 'util'

export const command: Command = {
	name: 'eval',
	aliases: [],
	examples: [],
	description: 'Eval stuff.',
	shortDescription: 'Eval stuff.',
	category: 'admin',
	permissions: ['sendMessages', 'embedLinks'],
	cooldown: 2,
	worksInDMs: true,
	canBeUsedInRaid: true,
	onlyWorksInRaidGuild: false,
	guildModsOnly: false,
	async execute (app, message, { args, prefix }) {
		let commandInput = message.content.substring(5 + prefix.length)

		if (commandInput.startsWith('```')) {
			// remove the first and last lines from code block
			commandInput = commandInput.split('\n').slice(1, -1).join('\n')
		}

		try {
			const start = new Date().getTime()
			// eslint-disable-next-line no-eval
			let evaled = await eval(commandInput)
			const end = new Date().getTime()

			if (typeof evaled !== 'string') evaled = inspect(evaled)

			const segments = evaled.match(/[\s\S]{1,1500}/g)

			if (segments.length === 1) {
				const evalEmbed = new Embed()
					.setDescription(`\`\`\`js\n${segments[0]}\`\`\``)
					.setColor(12118406)
					.setFooter(`${end - start}ms`)

				await reply(message, evalEmbed)
			}
			else {
				for (let i = 0; i < (segments.length < 5 ? segments.length : 5); i++) {
					await message.channel.createMessage(`\`\`\`js\n${segments[i]}\`\`\``)
				}
			}
		}
		catch (err) {
			const evalEmbed = new Embed()
				.setTitle('Something went wrong.')
				.setDescription(`\`\`\`js\n${err}\`\`\``)
				.setColor(13914967)

			await reply(message, evalEmbed)
		}
	}
}
