import { raidsGuilds } from '../config'
import { Item } from '../types/Items'
import { items } from './items'
import { NPC, npcs } from './npcs'

export interface Location {
	id: string
	display: string

	/**
	 * How long the raid lasts in seconds
	 */
	raidLength: number

	playerLimit: number

	requirements: {
		level: number
		item?: Item
	}

	/**
	 * IDs of guilds for this location
	 */
	guilds: string[]

	channels: RaidChannel[]
}

export type RaidChannel = LootChannel | EvacChannel

interface RaidChannelBase {
	type: 'EvacChannel' | 'LootChannel'
	name: string
	display: string
	scavange?: {
		/**
		 * Array of item names, one name is picked random
		 * 55% - 60% chance of rolling this loot pool
		 */
		common: {
			items: Item[]

			/**
			 * The amount of xp for rolling this loot drop
			 */
			xp: number
		}

		/**
		 * 25% chance of rolling this loot pool
		 */
		uncommon: {
			items: Item[]

			/**
			 * The amount of xp for rolling this loot drop
			 */
			xp: number
		}

		/**
		 * 15% chance of rolling this loot pool
		 */
		rare: {
			items: Item[]

			/**
			 * The amount of xp for rolling this loot drop
			 */
			xp: number
		}

		/**
		 * 5% chance of rolling this loot pool
		 */
		rarest?: {
			items: Item[]

			/**
			 * The amount of xp for rolling this loot drop
			 */
			xp: number
		}

		/**
		 * How many times to roll a random item name
		 */
		rolls: number

		/**
		 * How often this channel can be scavenged in seconds
		 */
		cooldown: number

		/**
		 * Key/item user must have in order to scavenge this channel
		 */
		requiresKey?: Item
	}

	/**
	 * Whether or not NPCs spawn in this channel
	 */
	npcSpawns?: {
		/**
		 * The minimum cooldown in seconds for an NPC to spawn after a previous NPC dies
		 */
		cooldownMin: number

		/**
		 * The maximum cooldown in seconds for an NPC to spawn after a previous NPC dies
		 */
		cooldownMax: number

		/**
		 * NPCs that can spawn in this channel
		 */
		npcs: NPC[]
	}
}

interface LootChannel extends RaidChannelBase {
	type: 'LootChannel'
}

interface EvacChannel extends RaidChannelBase {
	type: 'EvacChannel'
	evac: {
		/**
		 * How long in seconds it takes for user to evac
		 */
		time: number

		/**
		 * The key user must have in order to evac here, escaping here should remove 1 durability from the key
		 */
		requiresKey?: Item
	}
}

const locationsObject = <T>(et: { [K in keyof T]: Location & { id: K }}) => et

export const locations = locationsObject({
	suburbs: {
		id: 'suburbs',
		display: 'The Suburbs',
		guilds: raidsGuilds.suburbsGuilds,
		requirements: {
			level: 1
		},
		raidLength: 20 * 60,
		playerLimit: 20,
		channels: [
			{
				type: 'LootChannel',
				name: 'backstreets',
				display: 'Backstreets',
				scavange: {
					common: {
						items: [items.wooden_bat],
						xp: 5
					},
					uncommon: {
						items: [items.bandage, items.makeshift_pistol_ammo],
						xp: 10
					},
					rare: {
						items: [items.metal_bat, items.makeshift_pistol],
						xp: 20
					},
					rolls: 1,
					cooldown: 1 * 30
				}
			},
			{
				type: 'LootChannel',
				name: 'red-house',
				display: 'Red House',
				scavange: {
					common: {
						items: [items.makeshift_pistol, items.makeshift_pistol_ammo],
						xp: 5
					},
					uncommon: {
						items: [items.makeshift_rifle, items.makeshift_rifle_ammo],
						xp: 10
					},
					rare: {
						items: [items['glock-17'], items['9mm_fmj'], items.sledgehammer],
						xp: 20
					},
					rolls: 2,
					cooldown: 1 * 30
				},
				npcSpawns: {
					npcs: [npcs.walker_weak],
					cooldownMin: 60,
					cooldownMax: 2 * 60
				}
			},
			{
				type: 'LootChannel',
				name: 'apartments',
				display: 'Apartments',
				scavange: {
					common: {
						items: [items.shed_key, items.wooden_bat],
						xp: 5
					},
					uncommon: {
						items: [items.ifak_medkit, items.metal_bat],
						xp: 15
					},
					rare: {
						items: [items['glock-17'], items['9mm_fmj']],
						xp: 20
					},
					rolls: 2,
					cooldown: 1 * 30
				},
				npcSpawns: {
					npcs: [npcs.raider],
					cooldownMin: 3 * 60,
					cooldownMax: 5 * 60
				}
			},
			{
				type: 'EvacChannel',
				name: 'woods-evac',
				display: 'Woods',
				evac: {
					time: 15,
					requiresKey: items.shed_key
				}
			},
			{
				type: 'LootChannel',
				name: 'backyard-shed',
				display: 'Backyard Shed',
				scavange: {
					common: {
						items: [items.cloth_armor, items.cloth_helmet],
						xp: 5
					},
					uncommon: {
						items: [items.knife, items.wooden_helmet],
						xp: 10
					},
					rare: {
						items: [items.knife, items.ifak_medkit, items.wooden_armor],
						xp: 20
					},
					rolls: 2,
					cooldown: 1 * 30,
					requiresKey: items.shed_key
				}
			},
			{
				type: 'LootChannel',
				name: 'graveyard',
				display: 'Graveyard',
				npcSpawns: {
					npcs: [npcs.cain],
					cooldownMin: 30 * 60,
					cooldownMax: 60 * 60
				}
			},
			{
				type: 'EvacChannel',
				name: 'sewers-evac',
				display: 'Sewers',
				evac: {
					time: 30
				}
			}
		]
	},
	farm: {
		id: 'farm',
		display: 'The Farm',
		guilds: raidsGuilds.farmGuilds,
		requirements: {
			level: 3
		},
		raidLength: 20 * 60,
		playerLimit: 15,
		channels: [
			{
				type: 'LootChannel',
				name: 'backstreets',
				display: 'Backstreets',
				scavange: {
					common: {
						items: [items.wooden_bat],
						xp: 5
					},
					uncommon: {
						items: [items.bandage, items.makeshift_pistol_ammo],
						xp: 10
					},
					rare: {
						items: [items.metal_bat, items.makeshift_pistol],
						xp: 20
					},
					rolls: 1,
					cooldown: 1 * 30
				}
			},
			{
				type: 'LootChannel',
				name: 'red-house',
				display: 'Red House',
				scavange: {
					common: {
						items: [items.makeshift_pistol, items.makeshift_pistol_ammo],
						xp: 5
					},
					uncommon: {
						items: [items.makeshift_rifle, items.makeshift_rifle_ammo],
						xp: 10
					},
					rare: {
						items: [items['glock-17'], items['9mm_fmj'], items.sledgehammer],
						xp: 20
					},
					rolls: 2,
					cooldown: 1 * 30
				},
				npcSpawns: {
					npcs: [npcs.walker_weak],
					cooldownMin: 60,
					cooldownMax: 2 * 60
				}
			},
			{
				type: 'LootChannel',
				name: 'apartments',
				display: 'Apartments',
				scavange: {
					common: {
						items: [items.shed_key, items.wooden_bat],
						xp: 5
					},
					uncommon: {
						items: [items.ifak_medkit, items.metal_bat],
						xp: 15
					},
					rare: {
						items: [items['glock-17'], items['9mm_fmj']],
						xp: 20
					},
					rolls: 2,
					cooldown: 1 * 30
				},
				npcSpawns: {
					npcs: [npcs.raider],
					cooldownMin: 3 * 60,
					cooldownMax: 5 * 60
				}
			},
			{
				type: 'EvacChannel',
				name: 'woods-evac',
				display: 'Woods',
				evac: {
					time: 15,
					requiresKey: items.shed_key
				}
			},
			{
				type: 'LootChannel',
				name: 'backyard-shed',
				display: 'Backyard Shed',
				scavange: {
					common: {
						items: [items.cloth_armor, items.cloth_helmet],
						xp: 5
					},
					uncommon: {
						items: [items.knife, items.wooden_helmet],
						xp: 10
					},
					rare: {
						items: [items.knife, items.ifak_medkit, items.wooden_armor],
						xp: 20
					},
					rolls: 2,
					cooldown: 1 * 30,
					requiresKey: items.shed_key
				}
			},
			{
				type: 'LootChannel',
				name: 'graveyard',
				display: 'Graveyard',
				npcSpawns: {
					npcs: [npcs.cain],
					cooldownMin: 30 * 60,
					cooldownMax: 60 * 60
				}
			},
			{
				type: 'EvacChannel',
				name: 'sewers-evac',
				display: 'Sewers',
				evac: {
					time: 30
				}
			}
		]
	}
})

export const allLocations = Object.values(locations)
