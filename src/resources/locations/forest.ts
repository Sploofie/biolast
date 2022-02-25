import { Location } from '../../types/Locations'
import { items } from '../items'

export const forest: Location = {
	display: 'The Forest',
	icon: '<:forest:944973999492984842>',
	locationLevel: 3,
	boss: {
		cooldown: 60 * 60,
		npc: {
			type: 'raider',
			display: 'Zoro, The Mutated Scav',
			health: 300,
			damage: 50,
			drops: {
				common: [items.chainsaw],
				uncommon: [items.paracetamol],
				rare: [items.sacred_pendant],
				rolls: 2
			},
			weapon: items.saiga_MK,
			ammo: items['5.45x39mm_FMJ_bullet'],
			usesHeals: [items.compression_bandage],
			quotes: [],
			armor: items.wooden_armor,
			helmet: items.wooden_helmet,
			xp: 750,
			boss: true
		}
	},
	quests: [
		{
			type: 'Region',
			id: 'forest_key_1',
			questType: 'Scavenge With A Key',
			progressGoal: 1,
			key: items.sacred_pendant
		}
	],
	huntMobs: [
		{
			type: 'raider',
			display: 'Cultist',
			health: 70,
			damage: 50,
			drops: {
				common: [items.ifak_medkit],
				uncommon: [items['anti-biotics'], items.splint],
				rare: [items.sacred_pendant],
				rolls: 1
			},
			weapon: items['glock-17'],
			ammo: items['9mm_HP_bullet'],
			armor: items.cloth_armor,
			helmet: items.wooden_helmet,
			xp: 40,
			boss: false
		},
		{
			type: 'raider',
			display: 'Cultist',
			health: 60,
			damage: 35,
			drops: {
				common: [items.ifak_medkit],
				uncommon: [items['anti-biotics'], items.splint, items.cloth_backpack],
				rare: [items['9mm_HP_bullet']],
				rolls: 1
			},
			weapon: items.makeshift_shotgun,
			ammo: items.makeshift_shell,
			armor: items.wooden_armor,
			helmet: items.wooden_helmet,
			xp: 50,
			boss: false
		}
	],
	areas: [
		{
			display: 'Clearing',
			quote: 'its a large open field surrounded by trees on all sides.',
			loot: {
				common: {
					items: [items.bandage, items.sledgehammer],
					xp: 5
				},
				uncommon: {
					items: [items.ifak_medkit],
					xp: 15
				},
				rare: {
					items: [items['.45_ACP_FMJ_bullet'], items['9mm_HP_bullet']],
					xp: 20
				},
				rolls: 2
			}
		},
		{
			display: 'Treehouse',
			loot: {
				common: {
					items: [items.splint, items.ifak_medkit],
					xp: 5
				},
				uncommon: {
					items: [items.fire_axe],
					xp: 10
				},
				rare: {
					items: [items['glock-17']],
					xp: 20
				},
				rolls: 2
			}
		},
		{
			display: 'Cave',
			loot: {
				common: {
					items: [items.bandage],
					xp: 5
				},
				uncommon: {
					items: [items.wooden_armor, items.cloth_backpack, items.wooden_helmet],
					xp: 10
				},
				rare: {
					items: [items.chainsaw],
					xp: 20
				},
				rolls: 2
			}
		},
		{
			display: 'Campsite',
			loot: {
				common: {
					items: [items.apple],
					xp: 8
				},
				uncommon: {
					items: [items['9mm_HP_bullet'], items.cloth_backpack],
					xp: 10
				},
				rare: {
					items: [items['.45_ACP_FMJ_bullet']],
					xp: 15
				},
				rolls: 2
			}
		},
		{
			display: 'Abandoned Cabin',
			loot: {
				common: {
					items: [items.cultist_mask, items['9mm_FMJ_bullet']],
					xp: 5
				},
				uncommon: {
					items: [items.P320],
					xp: 10
				},
				rare: {
					items: [items['20-gauge_buckshot']],
					xp: 20
				},
				rolls: 2
			},
			requiresKey: items.sacred_pendant
		}
	]
}
