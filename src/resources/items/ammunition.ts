import { Ammunition } from '../../types/Items'
import { ranged } from './ranged'

const ammoObject = <T>(et: { [K in keyof T]: Ammunition & { name: K } }) => et

export const ammunition = ammoObject({
	'.338_lapua_FMJ': {
		type: 'Ammunition',
		name: '.338_lapua_FMJ',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['lapua', 'lapua_magnum', '.338', 'lapua_fmj'],
		description: 'Full metal jacket .338 Lapua Magnum ammunition for sniper rifles.',
		damage: 140,
		penetration: 5.4,
		ammoFor: [ranged.awm],
		sellPrice: 5035,
		slotsUsed: 1,
		itemLevel: 20
	},
	'.338_lapua_AP': {
		type: 'Ammunition',
		name: '.338_lapua_AP',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['.338_ap', 'lapua_ap', 'ap_lapua'],
		description: 'Armor-piercing .338 Lapua Magnum ammunition for sniper rifles.',
		damage: 133,
		penetration: 7.2,
		ammoFor: [ranged.awm],
		sellPrice: 10283,
		slotsUsed: 1,
		itemLevel: 20
	},
	'5.56x45mm_FMJ_bullet': {
		type: 'Ammunition',
		name: '5.56x45mm_FMJ_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['556mm', '5.56x45_fmj', '556', '556_rifle', '556x45', '556_fmj', '556_bullet'],
		description: 'Full metal jacket 5.56x45mm NATO ammunition for rifles.',
		damage: 40,
		penetration: 3.7,
		ammoFor: [ranged.m4a1],
		sellPrice: 467,
		slotsUsed: 1,
		itemLevel: 9
	},
	'5.56x45mm_HP_bullet': {
		type: 'Ammunition',
		name: '5.56x45mm_HP_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['5.56x45_hp', '556_hp', '556x45_hp'],
		description: 'Hollow point 5.56x45mm NATO ammunition for rifles.',
		damage: 50,
		penetration: 3.4,
		ammoFor: [ranged.m4a1],
		sellPrice: 523,
		slotsUsed: 1,
		itemLevel: 9
	},
	'7.62x39mm_FMJ_bullet': {
		type: 'Ammunition',
		name: '7.62x39mm_FMJ_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['762mm', '7.62x39_fmj', '762', '762_rifle', '762x39', '762_fmj', '762_bullet'],
		description: 'Full metal jacket 7.62x39mm ammunition.',
		damage: 45,
		penetration: 3.8,
		ammoFor: [ranged['ak-47']],
		sellPrice: 502,
		slotsUsed: 1,
		itemLevel: 9
	},
	'7.62x39mm_HP_bullet': {
		type: 'Ammunition',
		name: '7.62x39mm_HP_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['7.62x39_hp', '762_hp', '762x39_hp'],
		description: 'Hollow point 7.62x39mm ammunition.',
		damage: 56,
		penetration: 3.1,
		ammoFor: [ranged['ak-47']],
		sellPrice: 510,
		slotsUsed: 1,
		itemLevel: 9
	},
	'5.45x39mm_FMJ_bullet': {
		type: 'Ammunition',
		name: '5.45x39mm_FMJ_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['545mm', '5.45x39_fmj', '545', '545_rifle', '545x39', '545_fmj', '545_bullet'],
		description: 'Full metal jacket 5.45x39mm ammunition for Kalashnikov rifles.',
		damage: 31,
		penetration: 2.2,
		ammoFor: [ranged['aks-74u'], ranged.saiga_MK],
		sellPrice: 342,
		slotsUsed: 1,
		itemLevel: 7
	},
	'5.45x39mm_HP_bullet': {
		type: 'Ammunition',
		name: '5.45x39mm_HP_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['5.45x39_hp', '545_hp', '5.45_hp', '545x39_hp'],
		description: 'Hollow point 5.45x39mm ammunition for Kalashnikov rifles. Hollow point bullets expand when they hit their target, causing more damage.',
		damage: 43,
		penetration: 2.1,
		ammoFor: [ranged['aks-74u'], ranged.saiga_MK],
		sellPrice: 452,
		slotsUsed: 1,
		itemLevel: 9
	},
	'5.45x39mm_7N24_bullet': {
		type: 'Ammunition',
		name: '5.45x39mm_7N24_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['7n24', '5.45x39_7n24', '545_7n24', '5.45_7n24', '545x39_7n24'],
		description: '7N24 Armor-piercing 5.45x39mm ammunition for Kalashnikov rifles.',
		damage: 48,
		penetration: 3.35,
		ammoFor: [ranged['aks-74u'], ranged.saiga_MK],
		sellPrice: 2032,
		slotsUsed: 1,
		itemLevel: 14
	},
	'SS195LF_bullet': {
		type: 'Ammunition',
		name: 'SS195LF_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['5.7', '5.7mm', '5.7x28', '5.7x28mm', 'ss195', 'ss195lf', 'five-seven_bullet'],
		description: 'Lead free 5.7x28mm cartridge.',
		damage: 34,
		penetration: 2.3,
		ammoFor: [ranged['FN_Five-seveN'], ranged.FN_P90],
		sellPrice: 672,
		slotsUsed: 1,
		itemLevel: 7
	},
	'SS190_bullet': {
		type: 'Ammunition',
		name: 'SS190_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['ss190', 'ss190_ap'],
		description: 'Armor-piercing 5.7x28mm cartridge.',
		damage: 43,
		penetration: 3.2,
		ammoFor: [ranged['FN_Five-seveN'], ranged.FN_P90],
		sellPrice: 1624,
		slotsUsed: 1,
		itemLevel: 12
	},
	'9mm_FMJ_bullet': {
		type: 'Ammunition',
		name: '9mm_FMJ_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['9x19', '9mm', '9mm_fmj', 'bullet'],
		description: 'Full metal jacket ammunition for 9mm weapons.',
		damage: 20,
		penetration: 1.7,
		ammoFor: [ranged['glock-17'], ranged.P320, ranged.mp5],
		sellPrice: 158,
		slotsUsed: 1,
		itemLevel: 5
	},
	'9mm_HP_bullet': {
		type: 'Ammunition',
		name: '9mm_HP_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['9x19_hp', '9mm_hp'],
		description: 'Hollow point ammunition for 9mm weapons. Hollow point bullets expand when they hit their target, causing more damage.',
		damage: 40,
		penetration: 1.2,
		ammoFor: [ranged['glock-17'], ranged.mp5, ranged.P320],
		sellPrice: 302,
		slotsUsed: 1,
		itemLevel: 6
	},
	'9mm_RIP_bullet': {
		type: 'Ammunition',
		name: '9mm_RIP_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['9x19_rip', '9mm_rip', 'rip_bullet'],
		description: 'Radically invasive projectile ammunition for 9mm weapons. These bullets split into multiple pieces on impact, causing damage to spread further than a hollow point bullet.',
		damage: 52,
		penetration: 1.8,
		ammoFor: [ranged['glock-17'], ranged.P320, ranged.mp5],
		sellPrice: 1221,
		slotsUsed: 1,
		itemLevel: 12,
		spreadsDamageToLimbs: 4
	},
	'9mm_AP_bullet': {
		type: 'Ammunition',
		name: '9mm_AP_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['9x19_ap', '9mm_ap', 'ap_bullet'],
		description: 'Armor-piercing ammunition for 9mm weapons.',
		damage: 36,
		penetration: 2.9,
		ammoFor: [ranged.P320, ranged.mp5, ranged['glock-17']],
		sellPrice: 1531,
		slotsUsed: 1,
		itemLevel: 12
	},
	'.22LR_bullet': {
		type: 'Ammunition',
		name: '.22LR_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['.22', '.22lr', 'rimfire', '.22_rimfire', '.22_bullet'],
		description: 'Small bullet used for .22 caliber weapons.',
		damage: 20,
		penetration: 1.25,
		ammoFor: [ranged.luger],
		sellPrice: 51,
		slotsUsed: 1,
		itemLevel: 2
	},
	'makeshift_pistol_bullet': {
		type: 'Ammunition',
		name: 'makeshift_pistol_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['makeshift_ammo', 'pistol_ammo', 'pistol_bullet', 'makeshift_bullet'],
		description: 'A used pistol cartridge filled with homemade powder and a new bullet.',
		damage: 16,
		penetration: 0.9,
		ammoFor: [ranged.makeshift_pistol],
		sellPrice: 8,
		slotsUsed: 1,
		itemLevel: 1
	},
	'makeshift_rifle_bullet': {
		type: 'Ammunition',
		name: 'makeshift_rifle_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['rifle_ammo', 'rifle_bullet'],
		description: 'A used rifle cartridge filled with homemade powder and a new bullet.',
		damage: 20,
		penetration: 1.4,
		ammoFor: [ranged.makeshift_rifle],
		sellPrice: 32,
		slotsUsed: 1,
		itemLevel: 2
	},
	'makeshift_shell': {
		type: 'Ammunition',
		name: 'makeshift_shell',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['shell'],
		description: 'A handmade shotgun shell filled with cheap gunpowder and pellets.',
		damage: 24,
		penetration: 1.5,
		ammoFor: [ranged.makeshift_shotgun],
		sellPrice: 34,
		slotsUsed: 1,
		itemLevel: 3,
		spreadsDamageToLimbs: 2
	},
	'.303_FMJ_bullet': {
		type: 'Ammunition',
		name: '.303_FMJ_bullet',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['.303', '.303_fmj', '.303_bullet'],
		description: 'Full metal jacket ammo for a lee-enfield.',
		damage: 75,
		penetration: 4.0,
		ammoFor: [ranged['lee-enfield']],
		sellPrice: 2502,
		slotsUsed: 1,
		itemLevel: 15
	},
	'20-gauge_buckshot': {
		type: 'Ammunition',
		name: '20-gauge_buckshot',
		icon: '<:20_gauge_buckshot:931799444603670538>',
		aliases: ['buckshot', '20_guage', '20g_buckshot', '20g_shell', '20g_shotgun', '20g', 'buck'],
		description: '20-gauge buckshot is a shell that is smaller in caliber than a 12-gauge and fires many small pellets at a target.',
		damage: 50,
		penetration: 2.3,
		ammoFor: [ranged.bobwhite_g2],
		sellPrice: 415,
		slotsUsed: 1,
		itemLevel: 9,
		spreadsDamageToLimbs: 2,
		artist: '600383557038374913'
	},
	'20-gauge_slug': {
		type: 'Ammunition',
		name: '20-gauge_slug',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['slug', '20g_slug', 'slug_shell', 'shotgun_slug'],
		description: 'A 20-gauge slug shell that fires a single, large projectile.',
		damage: 65,
		penetration: 2.5,
		ammoFor: [ranged.bobwhite_g2],
		sellPrice: 615,
		slotsUsed: 1,
		itemLevel: 11
	},
	'12-gauge_buckshot': {
		type: 'Ammunition',
		name: '12-gauge_buckshot',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['12_guage', '12g_buckshot', '12g_shell', '12g_shotgun', '12g'],
		description: '20-gauge buckshot shell. Fires many small pellets at a target.',
		damage: 64,
		penetration: 2.9,
		ammoFor: [ranged.mossberg_500, ranged.benelli_M4],
		sellPrice: 1707,
		slotsUsed: 1,
		itemLevel: 12,
		spreadsDamageToLimbs: 2
	},
	'12-gauge_slug': {
		type: 'Ammunition',
		name: '12-gauge_slug',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['12g_slug'],
		description: 'A 12-gauge slug shell that fires a single, large projectile.',
		damage: 78,
		penetration: 3.12,
		ammoFor: [ranged.mossberg_500, ranged.benelli_M4],
		sellPrice: 2654,
		slotsUsed: 1,
		itemLevel: 14
	},
	'12-gauge_AP_slug': {
		type: 'Ammunition',
		name: '12-gauge_AP_slug',
		icon: '<:U_ammo:601366669318815745>',
		aliases: ['12g_ap_slug', '12g_ap', 'ap_slug', 'ap_shell', '12_ap_slug', '12_guage_ap'],
		description: 'A 12-gauge armor-piercing slug shell.',
		damage: 75,
		penetration: 4.05,
		ammoFor: [ranged.mossberg_500, ranged.benelli_M4],
		sellPrice: 5575,
		slotsUsed: 1,
		itemLevel: 17
	}
})
