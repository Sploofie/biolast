import { CommandOptionType, SlashCreator, CommandContext } from 'slash-create'
import App from '../app'
import { icons } from '../config'
import { allItems } from '../resources/items'
import { allNPCs } from '../resources/npcs'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Ammunition } from '../types/Items'
import { createCooldown, formatTime, getCooldown } from '../utils/db/cooldowns'
import { createItem, deleteItem, dropItemToGround, getGroundItems, getUserBackpack, lowerItemDurability, removeItemFromBackpack } from '../utils/db/items'
import { beginTransaction } from '../utils/db/mysql'
import { deleteNPC, getNPC, lowerHealth as lowerNPCHealth } from '../utils/db/npcs'
import { addXp, getUserRow, increaseDeaths, increaseKills, lowerHealth } from '../utils/db/players'
import { getUserQuests, increaseProgress } from '../utils/db/quests'
import { getUsersRaid, removeUserFromRaid } from '../utils/db/raids'
import formatHealth from '../utils/formatHealth'
import { getEquips, getItemDisplay, getItems, sortItemsByAmmo } from '../utils/itemUtils'
import { logger } from '../utils/logger'
import { messageUser } from '../utils/messageUtils'
import { BodyPart, getAttackDamage, getBodyPartHit } from '../utils/raidUtils'
import getRandomInt from '../utils/randomInt'

class AttackCommand extends CustomSlashCommand {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'attack',
			description: 'Attack another player using your equipped weapon.',
			longDescription: 'Attack another player using your equipped weapon. Make sure you have ammunition for the weapon you want to shoot.' +
				' If you specify a body part to target, your weapon accuracy will determine your chance to hit that target.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'user',
					description: 'Attack another player using your equipped weapon.',
					options: [
						{
							type: CommandOptionType.USER,
							name: 'target',
							description: 'User to attack.',
							required: true
						},
						{
							type: CommandOptionType.STRING,
							name: 'limb',
							description: 'The body part to target. Your chance of successfully hitting it is based on your weapon\'s accuracy.',
							required: false,
							choices: [
								{
									name: 'Head',
									value: 'head'
								},
								{
									name: 'Chest',
									value: 'chest'
								},
								{
									name: 'Arm',
									value: 'arm'
								},
								{
									name: 'Leg',
									value: 'leg'
								}
							]
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'npc',
					description: 'Attack an NPC in this channel using your equipped weapon.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'limb',
							description: 'The body part to target. Your chance of successfully hitting it is based on your weapon\'s accuracy.',
							required: false,
							choices: [
								{
									name: 'Head',
									value: 'head'
								},
								{
									name: 'Chest',
									value: 'chest'
								},
								{
									name: 'Arm',
									value: 'arm'
								},
								{
									name: 'Leg',
									value: 'leg'
								}
							]
						}
					]
				}
			],
			category: 'items',
			guildModsOnly: false,
			worksInDMs: false,
			onlyWorksInRaidGuild: true,
			canBeUsedInRaid: true,
			guildIDs: [],

			// can't defer this command because it pings users and editing the original
			// message will cause users not to get pinged
			noDefer: true
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		const guild = this.app.bot.guilds.get(ctx.guildID as string)
		if (!guild) {
			throw new Error('Guild not found in Eris cache')
		}
		const channel = guild.channels.get(ctx.channelID)
		if (!channel) {
			throw new Error('Could not find channel in Eris cache')
		}

		if (ctx.options.npc) {
			// attacking npc
			const transaction = await beginTransaction()
			const npcRow = await getNPC(transaction.query, ctx.channelID, true)
			const userData = (await getUserRow(transaction.query, ctx.user.id, true))!
			const attackCD = await getCooldown(transaction.query, ctx.user.id, 'attack')
			const partChoice: BodyPart | undefined = ctx.options.npc.limb

			if (!npcRow) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} There are no NPC's in this channel.`
				})
				return
			}

			const npc = allNPCs.find(n => n.id === npcRow?.id)

			if (!npc) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} There are no NPC's in this channel.`
				})
				return
			}
			else if (attackCD) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.timer} Your attack is on cooldown for **${attackCD}**. This is based on the attack rate of your weapon.`
				})
				return
			}

			const userBackpack = await getUserBackpack(transaction.query, ctx.user.id, true)

			// in case npc dies and need to update ground items
			await getGroundItems(transaction.query, ctx.channelID, true)

			const userBackpackData = getItems(userBackpack)
			const userEquips = getEquips(userBackpack)

			if (!userEquips.weapon) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} You don't have a weapon equipped. Equip a weapon from your inventory with \`/equip <item id>\`.`
				})
				return
			}

			const bodyPartHit = getBodyPartHit(userEquips.weapon.item.accuracy, partChoice)
			const missedPartChoice = partChoice && (partChoice !== bodyPartHit.result || !bodyPartHit.accurate)
			const messages = []
			const removedItems = []
			let finalDamage

			if (userEquips.weapon.item.type === 'Ranged Weapon') {
				const weaponUsed = userEquips.weapon.item
				const userAmmoUsed = sortItemsByAmmo(userBackpackData.items, true).find(i => i.item.type === 'Ammunition' && i.item.ammoFor.includes(weaponUsed))

				if (!userAmmoUsed) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.danger} You don't have any ammo for your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row, { showEquipped: false })}.` +
							` You need one of the following ammunitions in your inventory:\n\n${allItems.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponUsed)).map(i => getItemDisplay(i)).join(', ')}.`
					})
					return
				}

				const ammoItem = userAmmoUsed.item as Ammunition
				finalDamage = getAttackDamage(ammoItem.damage, ammoItem.penetration, bodyPartHit.result, npc.armor, npc.helmet)
				await deleteItem(transaction.query, userAmmoUsed.row.id)
				removedItems.push(userAmmoUsed.row.id)

				if (missedPartChoice) {
					messages.push(`${icons.danger} You try to shoot the \`${npc.type}\` in the **${partChoice}** with your ${getItemDisplay(userEquips.weapon.item)} (ammo: ${getItemDisplay(userAmmoUsed.item)}) **BUT YOU MISS DUE TO WEAPON ACCURACY!**\n`)
				}
				else {
					messages.push(`You shot the \`${npc.type}\` in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)} (ammo: ${getItemDisplay(userAmmoUsed.item)}). **${finalDamage.total}** damage dealt.\n`)
				}
			}
			else {
				finalDamage = getAttackDamage(userEquips.weapon.item.damage, userEquips.weapon.item.penetration, bodyPartHit.result, npc.armor, npc.helmet)

				if (missedPartChoice) {
					messages.push(`${icons.danger} You try to hit the \`${npc.type}\` in the **${partChoice}** with your ${getItemDisplay(userEquips.weapon.item)} **BUT YOU MISS DUE TO WEAPON ACCURACY!**\n`)
				}
				else {
					messages.push(`You hit the \`${npc.type}\` in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)}. **${finalDamage.total}** damage dealt.\n`)
				}
			}

			// add attack cooldown based on weapon attack rate
			await createCooldown(transaction.query, ctx.user.id, 'attack', userEquips.weapon.item.fireRate)

			// add message if users weapon accuracy allowed them to hit their targeted body part
			if (bodyPartHit.accurate) {
				messages.push(`${icons.crosshair} You hit the targeted limb (**${bodyPartHit.result}**)!`)
			}

			// remove weapon annd ammo
			if (userEquips.weapon.row.durability - 1 <= 0) {
				messages.push(`${icons.danger} Your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row, { showDurability: false, showEquipped: false })} broke from this attack.`)

				await deleteItem(transaction.query, userEquips.weapon.row.id)
				removedItems.push(userEquips.weapon.row.id)
			}
			else {
				messages.push(`Your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row, { showDurability: false, showEquipped: false })} now has **${userEquips.weapon.row.durability - 1}** durability.`)

				await lowerItemDurability(transaction.query, userEquips.weapon.row.id, 1)
			}

			if (!missedPartChoice && bodyPartHit.result === 'head' && npc.helmet) {
				messages.push(`The \`${npc.type}\`'s helmet (${getItemDisplay(npc.helmet)}) reduced the damage by **${finalDamage.reduced}**.`)
			}
			else if (!missedPartChoice && bodyPartHit.result === 'chest' && npc.armor) {
				messages.push(`The \`${npc.type}\`'s armor (${getItemDisplay(npc.armor)}) reduced the damage by **${finalDamage.reduced}**.`)
			}

			messages.push(`${icons.timer} Your attack is on cooldown for **${formatTime(userEquips.weapon.item.fireRate * 1000)}**.`)

			if (!missedPartChoice && npcRow.health - finalDamage.total <= 0) {
				const userQuests = (await getUserQuests(transaction.query, ctx.user.id, true)).filter(q => q.questType === 'NPC Kills' || q.questType === 'Any Kills' || q.questType === 'Boss Kills')
				const droppedItems = []

				if (npc.armor) {
					const armorDura = getRandomInt(Math.max(1, npc.armor.durability / 4), npc.armor.durability)
					const armorRow = await createItem(transaction.query, npc.armor.name, armorDura)
					await dropItemToGround(transaction.query, ctx.channelID, armorRow.id)

					droppedItems.push({
						item: npc.armor,
						row: armorRow
					})
				}

				if (npc.helmet) {
					const helmDura = getRandomInt(Math.max(1, npc.helmet.durability / 4), npc.helmet.durability)
					const helmRow = await createItem(transaction.query, npc.helmet.name, helmDura)
					await dropItemToGround(transaction.query, ctx.channelID, helmRow.id)

					droppedItems.push({
						item: npc.helmet,
						row: helmRow
					})
				}

				if (npc.type === 'raider' || npc.type === 'boss') {
					// drop weapon and ammo on ground

					if (npc.subtype === 'ranged') {
						// drop random amount of bullets
						const ammoToDrop = getRandomInt(1, 3)

						for (let i = 0; i < ammoToDrop; i++) {
							const ammoRow = await createItem(transaction.query, npc.ammo.name, npc.ammo.durability)
							await dropItemToGround(transaction.query, ctx.channelID, ammoRow.id)

							droppedItems.push({
								item: npc.ammo,
								row: ammoRow
							})
						}
					}

					// weapon durability is random
					const weapDurability = getRandomInt(Math.max(1, npc.weapon.durability / 4), npc.weapon.durability)
					const weapRow = await createItem(transaction.query, npc.weapon.name, weapDurability)
					await dropItemToGround(transaction.query, ctx.channelID, weapRow.id)

					droppedItems.push({
						item: npc.weapon,
						row: weapRow
					})
				}

				// roll random loot drops
				for (let i = 0; i < npc.drops.rolls; i++) {
					const lootDrop = this.app.npcHandler.getDrop(npc)

					if (lootDrop) {
						let itemDurability

						// item durability is random when dropped by npc
						if (lootDrop.durability) {
							itemDurability = getRandomInt(Math.max(1, lootDrop.durability / 4), lootDrop.durability)
						}

						const lootDropRow = await createItem(transaction.query, lootDrop.name, itemDurability)
						await dropItemToGround(transaction.query, ctx.channelID, lootDropRow.id)

						droppedItems.push({
							item: lootDrop,
							row: lootDropRow
						})
					}
				}

				await increaseKills(transaction.query, ctx.user.id, npc.type === 'boss' ? 'boss' : 'npc', 1)
				await addXp(transaction.query, ctx.user.id, npc.xp)
				await deleteNPC(transaction.query, ctx.channelID)
				// stop sending npcs saying that an NPC is in the channel
				this.app.npcHandler.clearNPCInterval(ctx.channelID)
				// start timer to spawn a new NPC
				await this.app.npcHandler.spawnNPC(ctx.channelID, channel.name)

				// check if user had any npc kill quests
				for (const quest of userQuests) {
					if (quest.progress < quest.progressGoal) {
						if (
							(quest.questType === 'Boss Kills' && npc.type === 'boss') ||
							(quest.questType === 'Any Kills' || quest.questType === 'NPC Kills')
						) {
							await increaseProgress(transaction.query, quest.id, 1)
						}
					}
				}

				await transaction.commit()

				messages.push(`\n☠️ **The \`${npc.type}\` DIED!** You earned 🌟 ***+${npc.xp}*** xp for this kill.`)

				const lootEmbed = new Embed()
					.setTitle('Items Dropped')
					.setDescription(droppedItems.map(itm => getItemDisplay(itm.item, itm.row)).join('\n'))
					.setFooter('These items were dropped onto the ground.')

				await ctx.send({
					content: messages.join('\n'),
					embeds: [lootEmbed.embed]
				})
			}
			else {
				if (!missedPartChoice) {
					await lowerNPCHealth(transaction.query, ctx.channelID, finalDamage.total)
					messages.push(`\nThe \`${npc.type}\` is left with ${formatHealth(npcRow.health - finalDamage.total, npc.health)} **${npcRow.health - finalDamage.total}** health.`)
				}

				const attackResult = await this.app.npcHandler.attackPlayer(transaction.query, ctx.user, userData, userBackpack, npc, ctx.channelID, removedItems)

				await transaction.commit()

				// user attack npc message
				await ctx.send({
					content: messages.join('\n')
				})

				// npc attacks user message
				await ctx.send({
					content: attackResult.messages.join('\n')
				})

				if (userData.health - attackResult.damage <= 0) {
					// player died
					try {
						const member = await this.app.fetchMember(guild, ctx.user.id)
						this.app.clearRaidTimer(ctx.user.id)

						if (member) {
							await member.kick(`User was killed by NPC: ${npc.type} (${npc.display})`)
						}
					}
					catch (err) {
						logger.error(err)
					}

					const erisUser = await this.app.fetchUser(ctx.user.id)
					if (erisUser) {
						await messageUser(erisUser, {
							content: `${icons.danger} Raid failed!\n\n` +
								`You were killed by a \`${npc.type}\` who hit you for **${attackResult.damage}** damage. Next time make sure you're well equipped to attack enemies.\n` +
								`You lost all the items in your inventory (**${userBackpackData.items.length - attackResult.removedItems}** items).`
						})
					}
				}
			}
		}
		else if (ctx.options.user) {
			// attacking player
			const member = ctx.members.get(ctx.options.user.target)
			const partChoice: BodyPart | undefined = ctx.options.user.limb

			if (!member) {
				await ctx.send({
					content: `${icons.danger} You need to pick someone to attack!`
				})
				return
			}
			else if (member.id === ctx.user.id) {
				await ctx.send({
					content: `${icons.warning} What are you doing? You can't attack yourself...`
				})
				return
			}

			const transaction = await beginTransaction()
			const victimData = await getUserRow(transaction.query, member.id, true)
			const victimRaidRow = await getUsersRaid(transaction.query, member.id, true)

			if (!victimData || !victimRaidRow) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} **${member.user.username}#${member.user.discriminator}** is not active in this raid!`
				})
				return
			}

			const attackCD = await getCooldown(transaction.query, ctx.user.id, 'attack')

			if (attackCD) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.timer} Your attack is on cooldown for **${attackCD}**. This is based on the attack rate of your weapon.`
				})
				return
			}

			const userBackpack = await getUserBackpack(transaction.query, ctx.user.id, true)
			const victimBackpack = await getUserBackpack(transaction.query, member.id, true)

			// in case victim dies and need to update ground items
			await getGroundItems(transaction.query, ctx.channelID, true)

			const userBackpackData = getItems(userBackpack)
			const victimBackpackData = getItems(victimBackpack)
			const userEquips = getEquips(userBackpack)
			const victimEquips = getEquips(victimBackpack)

			if (!userEquips.weapon) {
				await transaction.commit()

				await ctx.send({
					content: `${icons.warning} You don't have a weapon equipped. Equip a weapon from your inventory with \`/equip <item id>\`.`
				})
				return
			}

			const bodyPartHit = getBodyPartHit(userEquips.weapon.item.accuracy, partChoice)
			const missedPartChoice = partChoice && (partChoice !== bodyPartHit.result || !bodyPartHit.accurate)
			const messages = []
			let finalDamage
			let ammoUsed
			let attackPenetration

			if (userEquips.weapon.item.type === 'Ranged Weapon') {
				const weaponUsed = userEquips.weapon.item
				const userAmmoUsed = sortItemsByAmmo(userBackpackData.items, true).find(i => i.item.type === 'Ammunition' && i.item.ammoFor.includes(weaponUsed))

				if (!userAmmoUsed) {
					await transaction.commit()

					await ctx.send({
						content: `${icons.danger} You don't have any ammo for your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row)}.` +
							` You need one of the following ammunitions in your inventory:\n\n${allItems.filter(i => i.type === 'Ammunition' && i.ammoFor.includes(weaponUsed)).map(i => getItemDisplay(i)).join(', ')}.`
					})
					return
				}

				ammoUsed = userAmmoUsed
				const ammoItem = userAmmoUsed.item as Ammunition
				attackPenetration = ammoItem.penetration
				finalDamage = getAttackDamage(ammoItem.damage, ammoItem.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item)
				await deleteItem(transaction.query, userAmmoUsed.row.id)

				if (missedPartChoice) {
					messages.push(`${icons.danger} You try to shoot <@${member.id}> in the **${partChoice}** with your ${getItemDisplay(userEquips.weapon.item)} (ammo: ${getItemDisplay(userAmmoUsed.item)}) **BUT YOU MISS DUE TO WEAPON ACCURACY!**\n`)
				}
				else {
					messages.push(`You shot <@${member.id}> in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)} (ammo: ${getItemDisplay(userAmmoUsed.item)}). **${finalDamage.total}** damage dealt.\n`)
				}
			}
			else {
				attackPenetration = userEquips.weapon.item.penetration
				finalDamage = getAttackDamage(userEquips.weapon.item.damage, userEquips.weapon.item.penetration, bodyPartHit.result, victimEquips.armor?.item, victimEquips.helmet?.item)

				if (missedPartChoice) {
					messages.push(`${icons.danger} You try to hit <@${member.id}> in the **${partChoice}** with your ${getItemDisplay(userEquips.weapon.item)} **BUT YOU MISS DUE TO WEAPON ACCURACY!**\n`)
				}
				else {
					messages.push(`You hit <@${member.id}> in the **${bodyPartHit.result === 'head' ? '*HEAD*' : bodyPartHit.result}** with your ${getItemDisplay(userEquips.weapon.item)}. **${finalDamage.total}** damage dealt.\n`)
				}
			}

			// add attack cooldown based on weapon attack rate
			await createCooldown(transaction.query, ctx.user.id, 'attack', userEquips.weapon.item.fireRate)

			// add message if users weapon accuracy allowed them to hit their targeted body part
			if (bodyPartHit.accurate) {
				messages.push(`${icons.crosshair} You hit the targeted limb (**${bodyPartHit.result}**)!`)
			}

			// remove weapon annd ammo
			if (userEquips.weapon.row.durability - 1 <= 0) {
				messages.push(`${icons.danger} Your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row, { showDurability: false, showEquipped: false })} broke from this attack.`)

				await deleteItem(transaction.query, userEquips.weapon.row.id)
			}
			else {
				messages.push(`Your ${getItemDisplay(userEquips.weapon.item, userEquips.weapon.row, { showDurability: false, showEquipped: false })} now has **${userEquips.weapon.row.durability - 1}** durability.`)

				await lowerItemDurability(transaction.query, userEquips.weapon.row.id, 1)
			}

			if (!missedPartChoice && bodyPartHit.result === 'head' && victimEquips.helmet) {
				messages.push(`**${member.user.username}#${member.user.discriminator}**'s helmet (${getItemDisplay(victimEquips.helmet.item)}) reduced the damage by **${finalDamage.reduced}**.`)

				// only lower helmet durability if attackers weapon penetrates at least 50% of
				// the level of armor victim is wearing (so if someone used a knife with 1.0 level penetration
				// against someone who had level 3 armor, the armor would NOT lose durability)
				if (attackPenetration >= victimEquips.helmet.item.level / 2) {
					if (victimEquips.helmet.row.durability - 1 <= 0) {
						messages.push(`**${member.user.username}#${member.user.discriminator}**'s ${getItemDisplay(victimEquips.helmet.item)} broke from this attack!`)

						await deleteItem(transaction.query, victimEquips.helmet.row.id)
					}
					else {
						await lowerItemDurability(transaction.query, victimEquips.helmet.row.id, 1)
					}
				}
			}
			else if (!missedPartChoice && bodyPartHit.result === 'chest' && victimEquips.armor) {
				messages.push(`**${member.user.username}#${member.user.discriminator}**'s armor (${getItemDisplay(victimEquips.armor.item)}) reduced the damage by **${finalDamage.reduced}**.`)

				// only lower armor durability if attackers weapon penetrates at least 50% of
				// the level of armor victim is wearing (so if someone used a knife with 1.0 level penetration
				// against someone who had level 3 armor, the armor would NOT lose durability)
				if (attackPenetration >= victimEquips.armor.item.level / 2) {
					if (victimEquips.armor.row.durability - 1 <= 0) {
						messages.push(`**${member.user.username}#${member.user.discriminator}**'s ${getItemDisplay(victimEquips.armor.item)} broke from this attack!`)

						await deleteItem(transaction.query, victimEquips.armor.row.id)
					}
					else {
						await lowerItemDurability(transaction.query, victimEquips.armor.row.id, 1)
					}
				}
			}

			messages.push(`${icons.timer} Your attack is on cooldown for **${formatTime(userEquips.weapon.item.fireRate * 1000)}**.`)

			if (!missedPartChoice && victimData.health - finalDamage.total <= 0) {
				const userQuests = (await getUserQuests(transaction.query, ctx.user.id, true)).filter(q => q.questType === 'Player Kills' || q.questType === 'Any Kills')
				let xpEarned = 15

				for (const victimItem of victimBackpackData.items) {
					// 10 xp per item user had
					xpEarned += 10

					await removeItemFromBackpack(transaction.query, victimItem.row.id)
					await dropItemToGround(transaction.query, ctx.channelID, victimItem.row.id)
				}

				await increaseKills(transaction.query, ctx.user.id, 'player', 1)
				await increaseDeaths(transaction.query, member.id, 1)
				await addXp(transaction.query, ctx.user.id, xpEarned)
				await removeUserFromRaid(transaction.query, member.id)

				// check if user has any kill quests
				for (const quest of userQuests) {
					if (quest.progress < quest.progressGoal) {
						await increaseProgress(transaction.query, quest.id, 1)
					}
				}

				messages.push(`\n☠️ **${member.user.username}#${member.user.discriminator}** DIED! They dropped **${victimBackpackData.items.length}** items on the ground. Check the items they dropped with \`/ground view\`.`, `You earned 🌟 ***+${xpEarned}*** xp for this kill.`)
			}
			else if (!missedPartChoice) {
				await lowerHealth(transaction.query, member.id, finalDamage.total)

				messages.push(`\n**${member.user.username}#${member.user.discriminator}** is left with ${formatHealth(victimData.health - finalDamage.total, victimData.maxHealth)} **${victimData.health - finalDamage.total}** health.`)
			}

			// commit changes
			await transaction.commit()

			// send message to victim if they were killed.
			// this has to go after the transaction.commit() because if discord api is laggy,
			// it will cause the transaction to timeout (since the transaction would have to wait on discord to receive our message).
			if (!missedPartChoice && victimData.health - finalDamage.total <= 0) {
				try {
					const erisMember = await this.app.fetchMember(guild, member.id)
					this.app.clearRaidTimer(member.id)

					if (erisMember) {
						await erisMember.kick(`User was killed by ${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id})`)

						await messageUser(erisMember.user, {
							content: `${icons.danger} Raid failed!\n\n` +
								`You were killed by **${ctx.user.username}#${ctx.user.discriminator}** who hit you for **${finalDamage.total}** damage using their ${getItemDisplay(userEquips.weapon.item)}${ammoUsed ? ` (ammo: ${getItemDisplay(ammoUsed.item)})` : ''}.\n` +
								`You lost all the items in your inventory (**${victimBackpackData.items.length}** items).`
						})
					}
				}
				catch (err) {
					logger.error(err)
				}
			}

			await ctx.send({
				content: messages.join('\n')
			})
		}
	}
}

export default AttackCommand
