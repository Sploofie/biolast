import { CommandOptionType, SlashCreator, CommandContext, AutocompleteContext, Message, ComponentType, ComponentActionRow } from 'slash-create'
import App from '../app'
import { accuracyToTargetLimbs, icons } from '../config'
import { allItems, items } from '../resources/items'
import Corrector from '../structures/Corrector'
import CustomSlashCommand from '../structures/CustomSlashCommand'
import Embed from '../structures/Embed'
import { Ammunition, Item, ItemType } from '../types/Items'
import { getItem } from '../utils/argParsers'
import { getAttachments, getItemByID, getUserBackpack, getUserStash } from '../utils/db/items'
import { query } from '../utils/db/mysql'
import { formatMoney, getAfflictionEmoji } from '../utils/stringUtils'
import { getItemDisplay, getItemNameDisplay, getItems, sortItemsByAmmo, sortItemsByLevel } from '../utils/itemUtils'
import { allLocations } from '../resources/locations'
import { getEffectsDisplay } from '../utils/playerUtils'
import { GRAY_BUTTON, NEXT_BUTTON, PREVIOUS_BUTTON } from '../utils/constants'
import { logger } from '../utils/logger'
import { getUserRow } from '../utils/db/players'
import { formatTime } from '../utils/db/cooldowns'
import { skins } from '../resources/skins'
import { getSkinDisplay } from '../utils/skinUtils'
import { disableAllComponents } from '../utils/messageUtils'
import { merchantTrades } from '../resources/trades'

const itemCorrector = new Corrector([...allItems.map(itm => itm.name.toLowerCase()), ...allItems.map(itm => itm.aliases.map(a => a.toLowerCase())).flat(1)])
const ITEMS_PER_PAGE = 10

class ItemCommand extends CustomSlashCommand<'item'> {
	constructor (creator: SlashCreator, app: App) {
		super(creator, app, {
			name: 'item',
			description: 'View information about an item.',
			longDescription: 'View information about an item.',
			options: [
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'list',
					description: 'View a list of all the items you\'ve discovered.',
					options: []
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'info',
					description: 'View stats and general information about an item.',
					options: [
						{
							type: CommandOptionType.STRING,
							name: 'item',
							description: 'Name of the item.',
							required: true,
							autocomplete: true
						}
					]
				},
				{
					type: CommandOptionType.SUB_COMMAND,
					name: 'inspect',
					description: 'Inspect a specific item using the item ID.',
					options: [
						{
							type: CommandOptionType.INTEGER,
							name: 'id',
							description: 'ID of the item.',
							required: true
						}
					]
				}
			],
			category: 'equipment',
			guildModsOnly: false,
			worksInDMs: true,
			worksDuringDuel: true,
			guildIDs: []
		})

		this.filePath = __filename
	}

	async run (ctx: CommandContext): Promise<void> {
		if (ctx.options.list) {
			const userData = (await getUserRow(query, ctx.user.id))!
			const categorySelectMenu: ComponentActionRow = {
				type: ComponentType.ACTION_ROW,
				components: [
					{
						type: ComponentType.SELECT,
						custom_id: 'category',
						placeholder: 'Filter items by category:',
						options: Array.from(new Set(allItems.map(i => i.type))).sort().map(c => {
							const info = this.getCategoryInfo(c)
							const iconID = info.icon.match(/:([0-9]*)>/)

							return {
								label: c,
								value: c,
								description: info.description,
								emoji: iconID ? {
									id: iconID[1],
									name: c
								} : undefined
							}
						})
					}
				]
			}
			const discoveredItems = allItems.filter(i => i.itemLevel <= userData.level)
			const undiscoveredCount = allItems.filter(i => !discoveredItems.includes(i)).length
			let pages = this.generatePages(discoveredItems, undiscoveredCount)
			let page = 0

			const botMessage = await ctx.send({
				embeds: [pages[0].embed],
				components: [
					categorySelectMenu,
					{
						type: ComponentType.ACTION_ROW,
						components: [
							PREVIOUS_BUTTON(true),
							NEXT_BUTTON(false)
						]
					}
				]
			}) as Message

			const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => c.user.id === ctx.user.id, 80000)

			collector.on('collect', async buttonCtx => {
				try {
					await buttonCtx.acknowledge()

					if (buttonCtx.customID === 'previous' && page !== 0) {
						page--

						await buttonCtx.editParent({
							embeds: [pages[page].embed],
							components: [
								categorySelectMenu,
								{
									type: ComponentType.ACTION_ROW,
									components: [
										PREVIOUS_BUTTON(page === 0),
										NEXT_BUTTON(false)
									]
								}
							]
						})
					}
					else if (buttonCtx.customID === 'next' && page !== (pages.length - 1)) {
						page++

						await buttonCtx.editParent({
							embeds: [pages[page].embed],
							components: [
								categorySelectMenu,
								{
									type: ComponentType.ACTION_ROW,
									components: [
										PREVIOUS_BUTTON(false),
										NEXT_BUTTON(page === (pages.length - 1))
									]
								}
							]
						})
					}
					else if (buttonCtx.customID === 'category') {
						const newComponents: ComponentActionRow[] = [categorySelectMenu]
						pages = this.generatePages(discoveredItems.filter(i => i.type === buttonCtx.values[0]), undiscoveredCount, buttonCtx.values[0])
						page = 0

						if (pages.length > 1) {
							newComponents.push({
								type: ComponentType.ACTION_ROW,
								components: [
									PREVIOUS_BUTTON(true),
									NEXT_BUTTON(false)
								]
							})
						}

						await buttonCtx.editParent({
							embeds: [pages[0].embed],
							components: newComponents
						})
					}
				}
				catch (err) {
					// continue
				}
			})

			collector.on('end', async msg => {
				try {
					if (msg === 'time') {
						await botMessage.edit({
							content: `${icons.warning} Buttons timed out.`,
							embeds: [pages[page].embed],
							components: disableAllComponents(botMessage.components)
						})
					}
				}
				catch (err) {
					logger.warn(err)
				}
			})

			return
		}
		if (ctx.options.inspect) {
			const itemID = ctx.options.inspect.id
			const backpackRows = await getUserBackpack(query, ctx.user.id)
			const stashRows = await getUserStash(query, ctx.user.id)
			const userBackpackData = getItems(backpackRows)
			const userStashData = getItems(stashRows)
			let attachments
			let itemToCheck = userBackpackData.items.find(itm => itm.row.id === itemID) || userStashData.items.find(itm => itm.row.id === itemID)

			if (!itemToCheck) {
				const itemRow = await getItemByID(query, itemID)

				if (!itemRow || !getItems([itemRow]).items.length) {
					await ctx.send({
						content: `${icons.warning} An item with the ID **${itemID}** does not exist.`
					})
					return
				}

				itemToCheck = getItems([itemRow]).items[0]
			}

			const attachmentRows = await getAttachments(query, [itemToCheck.row])
			if (attachmentRows.length) {
				attachments = getItems(attachmentRows)
			}

			const detailsEmbed = new Embed()
				.setDescription(getItemDisplay(itemToCheck.item, itemToCheck.row, { showDurability: false }))
				.addField('Item Type', itemToCheck.item.type === 'Throwable Weapon' ? `${itemToCheck.item.type} (${itemToCheck.item.subtype})` : itemToCheck.item.type)
				.addField('Created', `${formatTime(Date.now() - itemToCheck.row.itemCreatedAt.getTime())} ago`, true)

			if (itemToCheck.row.durability) {
				detailsEmbed.addField('Durability', `Can be used **${itemToCheck.row.durability}** more times.`, true)
			}

			if (attachments && attachments.items.length) {
				detailsEmbed.addField('Attachments', attachments.items.map(a => getItemDisplay(a.item)).join('\n'))
			}

			if (itemToCheck.row.skin) {
				const skin = skins.find(s => s.name === itemToCheck?.row.skin)

				if (skin) {
					detailsEmbed.addField('Skin Applied', getSkinDisplay(skin), true)
				}
			}

			await ctx.send({
				embeds: [detailsEmbed.embed]
			})
			return
		}

		// item info command
		const item = getItem([ctx.options.info.item])

		if (!item) {
			const related = itemCorrector.getWord(ctx.options.info.item, 5)
			const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

			await ctx.send({
				content: relatedItem ? `${icons.information} Could not find an item matching that name. Did you mean ${getItemDisplay(relatedItem)}?` : `${icons.warning} Could not find an item matching that name.`
			})
			return
		}

		const itemFixed = item
		const itemEmbed = this.getItemEmbed(itemFixed)
		const botMessage = await ctx.send({
			embeds: [itemEmbed.embed],
			components: [{
				type: ComponentType.ACTION_ROW,
				components: [GRAY_BUTTON('Where can I find this item?', 'find')]
			}]
		}) as Message

		const { collector } = this.app.componentCollector.createCollector(botMessage.id, c => true, 60000)

		collector.on('collect', async buttonCtx => {
			try {
				if (buttonCtx.customID === 'find') {
					const userData = await getUserRow(query, buttonCtx.user.id)
					const obtainedFrom: { [key: string]: string[] } = { ...allLocations.reduce((prev, curr) => ({ ...prev, [curr.display]: [] }), {}), Merchant: [] }

					if (!userData) {
						await buttonCtx.send({
							ephemeral: true,
							content: `${icons.danger} It looks like you've never played before... What are you waiting for? Use \`/help\` to learn how to play.`
						})
						return
					}

					for (const loc of allLocations) {
						for (const area of loc.areas) {
							if (area.loot.common.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Commonly found from scavenging **${area.display}**.`)
							}
							else if (area.loot.uncommon.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Uncommonly found from scavenging **${area.display}**.`)
							}
							else if (area.loot.rare.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Rarely found from scavenging **${area.display}**.`)
							}
							else if (area.loot.rarest?.items.find(i => i.name === itemFixed.name)) {
								obtainedFrom[loc.display].push(`Very rarely found from scavenging **${area.display}**.`)
							}
						}

						const npcsWithItem = loc.huntMobs.filter(mob => (
							(mob.armor && mob.armor.name === itemFixed.name) ||
							(mob.helmet && mob.helmet.name === itemFixed.name) ||
							(mob.type === 'raider' && mob.weapon.name === itemFixed.name) ||
							(mob.type === 'raider' && 'ammo' in mob && mob.ammo.name === itemFixed.name) ||
							(mob.drops.common.find(i => i.name === itemFixed.name)) ||
							(mob.drops.uncommon.find(i => i.name === itemFixed.name)) ||
							(mob.drops.rare.find(i => i.name === itemFixed.name))
						))

						for (const mob of npcsWithItem) {
							obtainedFrom[loc.display].push(`${mob.boss ? `**${mob.display}**` : `A **${mob.display}**`} was spotted with this item.`)
						}

						if (
							loc.miniboss &&
							(
								(loc.miniboss.npc.armor && loc.miniboss.npc.armor.name === itemFixed.name) ||
								(loc.miniboss.npc.helmet && loc.miniboss.npc.helmet.name === itemFixed.name) ||
								(loc.miniboss.npc.type === 'raider' && loc.miniboss.npc.weapon.name === itemFixed.name) ||
								(loc.miniboss.npc.type === 'raider' && 'ammo' in loc.miniboss.npc && loc.miniboss.npc.ammo.name === itemFixed.name) ||
								(loc.miniboss.npc.drops.common.find(i => i.name === itemFixed.name)) ||
								(loc.miniboss.npc.drops.uncommon.find(i => i.name === itemFixed.name)) ||
								(loc.miniboss.npc.drops.rare.find(i => i.name === itemFixed.name))
							)
						) {
							obtainedFrom[loc.display].push(`**${loc.miniboss.npc.display}** (miniboss) was spotted with this item.`)
						}

						if (
							(loc.boss.npc.armor && loc.boss.npc.armor.name === itemFixed.name) ||
							(loc.boss.npc.helmet && loc.boss.npc.helmet.name === itemFixed.name) ||
							(loc.boss.npc.type === 'raider' && loc.boss.npc.weapon.name === itemFixed.name) ||
							(loc.boss.npc.type === 'raider' && 'ammo' in loc.boss.npc && loc.boss.npc.ammo.name === itemFixed.name) ||
							(loc.boss.npc.drops.common.find(i => i.name === itemFixed.name)) ||
							(loc.boss.npc.drops.uncommon.find(i => i.name === itemFixed.name)) ||
							(loc.boss.npc.drops.rare.find(i => i.name === itemFixed.name))
						) {
							obtainedFrom[loc.display].push(`**${loc.boss.npc.display}** (boss) was spotted with this item, good luck trying to get it.`)
						}
					}

					for (const trade of merchantTrades) {
						if (trade.offer.item.name === itemFixed.name) {
							if (userData.locationLevel < trade.locationLevel) {
								obtainedFrom.Merchant.push(`The merchant trades this item once you reach region tier **${trade.locationLevel}**.`)
							}
							else if (trade.type === 'money') {
								obtainedFrom.Merchant.push(`The merchant trades this item in return for **${formatMoney(trade.price)}**.`)
							}
							else {
								obtainedFrom.Merchant.push(`The merchant trades this item in return for **${getItemDisplay(trade.price)}**.`)
							}
						}
					}

					const placesFound = Object.keys(obtainedFrom).reduce((prev, curr) => prev + obtainedFrom[curr].length, 0)
					if (!placesFound) {
						await buttonCtx.send({
							content: `${getItemDisplay(itemFixed)} cannot be found from scavenging! However, a companion could fetch it if they have enough perception...`,
							ephemeral: true
						})
						return
					}

					await buttonCtx.send({
						content: `${getItemDisplay(itemFixed)} can be found in the following areas:\n\n` +
							`${Object.keys(obtainedFrom).filter(loc => obtainedFrom[loc].length).map(loc => {
								const location = allLocations.find(l => l.display === loc)

								if (location && userData.locationLevel < location.locationLevel) {
									return `__${loc.replace(/\w/g, '?')} (Tier ${location.locationLevel} region)__\nSpotted in a region you haven't discovered yet.`
								}

								return `__${loc}__\n${obtainedFrom[loc].join('\n')}`
							}).join('\n\n')}`,
						ephemeral: true
					})
				}
			}
			catch (err) {
				// continue
			}
		})

		collector.on('end', msg => {
			if (msg === 'time') {
				botMessage.edit({
					components: []
				})
			}
		})
	}

	generatePages (itemList: Item[], undiscoveredItems: number, category?: string): Embed[] {
		const pages = []
		const maxPage = Math.ceil(itemList.length / ITEMS_PER_PAGE) || 1
		const sortedItems = sortItemsByLevel(itemList, false, false)

		for (let i = 1; i < maxPage + 1; i++) {
			const indexFirst = (ITEMS_PER_PAGE * i) - ITEMS_PER_PAGE
			const indexLast = ITEMS_PER_PAGE * i
			const filteredItems = sortedItems.slice(indexFirst, indexLast)

			const embed = new Embed()
				.setDescription(`${icons.information} This list only includes items you are a high enough level to discover. Level up to expand this list.` +
					` There are **${undiscoveredItems}** items you haven't discovered.` +
					`\n\n__**${category ? `${category} Item List**__ (${itemList.length} total)` : `Item List**__ (${itemList.length} total)`}` +
					`\n${filteredItems.map(itm => `${getItemDisplay(itm)} (Level **${itm.itemLevel}** item)`).join('\n') ||
					`You are not a high enough level to discover any ${category ? `**${category}**` : ''} items`}`)

			if (maxPage > 1) {
				embed.setFooter(`Page ${i}/${maxPage}`)
			}

			pages.push(embed)
		}

		return pages
	}

	getItemEmbed (item: Item): Embed {
		const itemEmbed = new Embed()
			.setDescription(getItemDisplay(item))
			.addField('Item Type', item.type === 'Throwable Weapon' ? `${item.type} (${item.subtype})` : item.type)
			.addField('Item Level', `Level **${item.itemLevel}**`)

		if (item.description) {
			itemEmbed.addField('Description', item.description)
		}

		itemEmbed.addField('Item Weight', `Uses **${item.slotsUsed}** slot${item.slotsUsed === 1 ? '' : 's'}`, true)

		if (item.sellPrice) {
			itemEmbed.addField('Sell Price', formatMoney(Math.floor(item.sellPrice * this.app.currentShopSellMultiplier)), true)
		}

		if (item.durability) {
			itemEmbed.addField('Max Uses', `Can be used up to **${item.durability}** times`, true)
		}

		switch (item.type) {
			case 'Backpack': {
				itemEmbed.addField('Carry Capacity', `Adds ***+${item.slots}*** slots`, true)
				break
			}
			case 'Ammunition': {
				if (item.spreadsDamageToLimbs) {
					itemEmbed.addField('Damage', `${item.damage} (${Math.round(item.damage / item.spreadsDamageToLimbs)} x ${item.spreadsDamageToLimbs} limbs)`, true)
					itemEmbed.addField('Special', `Spreads damage across **${item.spreadsDamageToLimbs}** limbs.`, true)
				}
				else {
					itemEmbed.addField('Damage', item.damage.toString(), true)
				}
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				itemEmbed.addField('Ammo For', item.ammoFor.map(itm => getItemDisplay(itm)).join('\n'), true)
				break
			}
			case 'Melee Weapon': {
				itemEmbed.addField('Accuracy', `${item.accuracy}% ${item.accuracy < accuracyToTargetLimbs ? '(cannot target limbs)' : '(can target limbs)'}`, true)
				itemEmbed.addField('Damage', item.damage.toString(), true)
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				break
			}
			case 'Throwable Weapon': {
				itemEmbed.addField('Accuracy', `${item.accuracy}% ${item.accuracy < accuracyToTargetLimbs ? '(cannot target limbs)' : '(can target limbs)'}`, true)
				if (item.spreadsDamageToLimbs) {
					itemEmbed.addField('Damage', `${item.damage} (${Math.round(item.damage / item.spreadsDamageToLimbs)} x ${item.spreadsDamageToLimbs} limbs)`, true)
					itemEmbed.addField('Special', `Spreads damage across **${item.spreadsDamageToLimbs}** limbs.`, true)
				}
				else {
					itemEmbed.addField('Damage', item.damage.toString(), true)
				}
				if (item.subtype === 'Incendiary Grenade') {
					itemEmbed.addField('Applies Affliction', `${icons.burning} Burning (+25% damage taken)`, true)
				}
				itemEmbed.addField('Armor Penetration', item.penetration.toFixed(2), true)
				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				break
			}
			case 'Ranged Weapon': {
				const ammunition = sortItemsByAmmo(allItems.filter(itm => itm.type === 'Ammunition' && itm.ammoFor.includes(item))) as Ammunition[]

				itemEmbed.addField('Accuracy', `${item.accuracy}% ${item.accuracy < accuracyToTargetLimbs ? '(cannot target limbs)' : '(can target limbs)'}`, true)
				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				itemEmbed.addField('Compatible Ammo', ammunition.map(itm => `${getItemDisplay(itm)} (${itm.spreadsDamageToLimbs ?
					`**${Math.round(itm.damage / itm.spreadsDamageToLimbs)} x ${itm.spreadsDamageToLimbs}** damage` :
					`**${itm.damage}** damage`}, **${itm.penetration}** armor penetration)`).join('\n'))
				break
			}
			case 'Body Armor': {
				itemEmbed.addField('Armor Level', `Level **${item.level}** protection.\n\n${icons.information} Reduces damage from weapons/ammo with a penetration below **${item.level.toFixed(2)}**`)
				break
			}
			case 'Helmet': {
				itemEmbed.addField('Armor Level', `Level **${item.level}** protection.\n\n${icons.information} Reduces damage from weapons/ammo with a penetration below **${item.level.toFixed(2)}**`)
				break
			}
			case 'Stimulant': {
				const effectsDisplay = getEffectsDisplay(item.effects)

				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				itemEmbed.addField('Gives Effects', effectsDisplay.join('\n'), true)
				break
			}
			case 'Medical': {
				const curesAfflictions = []

				itemEmbed.addField('Speed', `${item.speed} (determines turn order in duels)`, true)
				itemEmbed.addField('Heals For', `${item.healsFor} health`, true)

				if (item.curesBitten) {
					curesAfflictions.push(`${getAfflictionEmoji('Bitten')} Bitten`)
				}
				if (item.curesBrokenArm) {
					curesAfflictions.push(`${getAfflictionEmoji('Broken Arm')} Broken Arm`)
				}
				if (item.curesBurning) {
					curesAfflictions.push(`${getAfflictionEmoji('Burning')} Burning`)
				}

				if (curesAfflictions.length) {
					itemEmbed.addField('Cures Afflictions', curesAfflictions.join('\n'), true)
				}
				break
			}
			case 'Food': {
				itemEmbed.addField('Effects on Companion',
					`Reduces companion hunger by **${item.reducesHunger}**` +
					`\nIncreases companion xp by **${item.xpGiven}**`,
					true)
				break
			}
			case 'Key': {
				const usableAreas = []

				for (const location of allLocations) {
					for (const area of location.areas) {
						if (area.requiresKey === item) {
							usableAreas.push(`${area.display} (${location.display})`)
						}
					}
				}

				itemEmbed.addField('Used to Scavenge', usableAreas.join('\n'), true)
			}
		}

		return itemEmbed
	}

	getCategoryInfo (category: ItemType): { description: string, icon: string } {
		switch (category) {
			case 'Ammunition': {
				return {
					icon: items['20-gauge_buckshot'].icon,
					description: 'Ammo used to fire Ranged Weapons.'
				}
			}
			case 'Backpack': {
				return {
					icon: items.cloth_backpack.icon,
					description: 'Equippable items that increase inventory space.'
				}
			}
			case 'Helmet': {
				return {
					icon: items.aramid_helmet.icon,
					description: 'Equippable items that reduce damage from attacks.'
				}
			}
			case 'Body Armor': {
				return {
					icon: items.aramid_armor.icon,
					description: 'Equippable items that reduce damage from attacks.'
				}
			}
			case 'Collectible': {
				return {
					icon: items.dog_tags.icon,
					description: 'Rare items worth collecting.'
				}
			}
			case 'Food': {
				return {
					icon: items.donut.icon,
					description: 'Items used to feed your companion.'
				}
			}
			case 'Key': {
				return {
					icon: items.shed_key.icon,
					description: 'Items used to scavenge locked areas.'
				}
			}
			case 'Medical': {
				return {
					icon: items.ifak_medkit.icon,
					description: 'Items used to heal yourself'
				}
			}
			case 'Melee Weapon': {
				return {
					icon: items.sledgehammer.icon,
					description: 'Weapons that can be used without ammunition.'
				}
			}
			case 'Ranged Weapon': {
				return {
					icon: items['ak-47'].icon,
					description: 'Weapons that fire ammunition.'
				}
			}
			case 'Throwable Weapon': {
				return {
					icon: items.M67_grenade.icon,
					description: 'Weapons such as grenades that can be thrown.'
				}
			}
			case 'Stimulant': {
				return {
					icon: items.morphine.icon,
					description: 'Injectors used for temporary stat boosts during fights.'
				}
			}
		}
	}

	async autocomplete (ctx: AutocompleteContext): Promise<void> {
		const search = ctx.options.info[ctx.focused].replace(/ +/g, '_').toLowerCase()
		const itemSearch = allItems.filter(itm => itm.name.toLowerCase().includes(search) || itm.type.toLowerCase().includes(search))

		if (itemSearch.length) {
			await ctx.sendResults(itemSearch.slice(0, 25).map(itm => ({ name: `${itm.type} - ${getItemNameDisplay(itm)}`, value: getItemNameDisplay(itm) })))
		}
		else {
			const related = itemCorrector.getWord(search, 5)
			const relatedItem = related && allItems.find(i => i.name.toLowerCase() === related || i.aliases.map(a => a.toLowerCase()).includes(related))

			if (relatedItem) {
				await ctx.sendResults([{ name: `${relatedItem.type} - ${getItemNameDisplay(relatedItem)}`, value: getItemNameDisplay(relatedItem) }])
			}
			else {
				await ctx.sendResults([])
			}
		}
	}
}

export default ItemCommand
