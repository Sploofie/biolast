import { Guild } from 'eris'
import { LocationName } from '../../resources/locations'
import { Query, UserStarterTipsRow, UserRow } from '../../types/mysql'

/**
 *
 * @param query Query to use
 * @param userID ID of user to get row of
 * @param forUpdate Whether this is used in an SQL transaction
 * @returns Users data
 */
export async function getUserRow (query: Query, userID: string, forUpdate = false): Promise<UserRow | undefined> {
	return (await query(`SELECT * FROM users WHERE userId = ?${forUpdate ? ' FOR UPDATE' : ''}`, [userID]))[0]
}

/**
 *
 * @param query Query to use
 * @param userID ID of user to get row of
 * @returns Users starter tips row
 */
export async function getUserTipsRow (query: Query, userID: string): Promise<UserStarterTipsRow | undefined> {
	return (await query('SELECT * FROM users_starter_tips WHERE userId = ?', [userID]))[0]
}

/**
 * Adds money to a users stash
 * @param query Query to use
 * @param userID ID of user to add money to
 * @param amount Amount of money to add
 */
export async function addMoney (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET money = money + ? WHERE userId = ?', [amount, userID])
}

/**
 * Removes money from a users stash
 * @param query Query to use
 * @param userID ID of user to remove money from
 * @param amount Amount of money to remove
 */
export async function removeMoney (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET money = money - ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users health
 * @param query Query to use
 * @param userID ID of user to increase health of
 * @param amount Amount of health to add
 */
export async function addHealth (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET health = health + ? WHERE userId = ?', [amount, userID])
}

/**
 * Lowers a users health
 * @param query Query to use
 * @param userID ID of user to lower health of
 * @param amount Amount of health to remove
 */
export async function lowerHealth (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET health = health - ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users level
 * @param query Query to use
 * @param userID ID of user to increase level of
 * @param amount Amount to increase level by
 */
export async function increaseLevel (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET level = level + ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users questsCompleted stat
 * @param query Query to use
 * @param userID ID of user to increase stat of
 * @param amount Amount to increase stat by
 */
export async function increaseQuestsCompleted (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET questsCompleted = questsCompleted + ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users shop sales (how many items user has bought from shop)
 * @param query Query to use
 * @param userID ID of user to increase shop sales of
 * @param amount Amount to increase sales by
 */
export async function increaseShopSales (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET shopSales = shopSales + ? WHERE userId = ?', [amount, userID])
}

/**
 * Increases a users kill count
 * @param query Query to use
 * @param userID ID of user to increase kills of
 * @param type The type of kill stat to increase. Can be player kills, npc kills,
 * or boss npc kills (boss npc kills will increase both npc and boss)
 * @param amount Amount to increase kills by
 */
export async function increaseKills (query: Query, userID: string, type: 'player' | 'npc' | 'boss', amount: number): Promise<void> {
	switch (type) {
		case 'player': {
			await query('UPDATE users SET kills = kills + ? WHERE userId = ?', [amount, userID])
			break
		}
		case 'npc': {
			await query('UPDATE users SET npcKills = npcKills + ? WHERE userId = ?', [amount, userID])
			break
		}
		case 'boss': {
			await query('UPDATE users SET bossKills = bossKills + ?, npcKills = npcKills + ? WHERE userId = ?', [amount, amount, userID])
		}
	}
}

/**
 * Increases a users death count
 * @param query Query to use
 * @param userID ID of user to increase deaths of
 * @param amount Amount to increase deaths by
 */
export async function increaseDeaths (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET deaths = deaths + ? WHERE userId = ?', [amount, userID])
}

/**
 * Set a users max health
 * @param query Query to use
 * @param userID ID of user to set max health of
 * @param amount Amount to set max health to
 */
export async function setMaxHealth (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET maxHealth = ? WHERE userId = ?', [amount, userID])
}

/**
 * Set whether a user is in a fight (PvP or PvE)
 * @param query Query to use
 * @param userID ID of user to set
 * @param fighting Whether user is currently fighting
 */
export async function setFighting (query: Query, userID: string, fighting: boolean): Promise<void> {
	await query('UPDATE users SET fighting = ? WHERE userId = ?', [fighting ? 1 : 0, userID])
}

/**
 * Set a users stash space
 * @param query Query to use
 * @param userID ID of user to set stash slots of
 * @param amount Amount to set stash slots to
 */
export async function setStashSlots (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET stashSlots = ? WHERE userId = ?', [amount, userID])
}

/**
 * Add to users xp
 * @param query Query to use
 * @param userID ID of user to increase xp of
 * @param amount Amount to increase xp by
 */
export async function addXp (query: Query, userID: string, amount: number): Promise<void> {
	await query('UPDATE users SET xp = xp + ? WHERE userId = ?', [amount, userID])
}

/**
 * @param query Query to use
 * @param userID ID of user to set
 * @param locationID ID of location user travels to
 */
export async function setLocation (query: Query, userID: string, locationID: LocationName): Promise<void> {
	await query('UPDATE users SET currentLocation = ? WHERE userId = ?', [locationID, userID])
}

/**
 * @param query Query to use
 * @param userID ID of user to set
 * @param locationLevel value to set users location level to
 */
export async function setLocationLevel (query: Query, userID: string, locationLevel: number): Promise<void> {
	await query('UPDATE users SET locationLevel = ? WHERE userId = ?', [locationLevel, userID])
}

/**
 * Creates an account for user
 * @param query Query to use
 * @param userID ID of user to create account for
 */
export async function createAccount (query: Query, userID: string): Promise<void> {
	await query('INSERT INTO users (userId) VALUES (?)', [userID])
}

/**
 * Sets whether or not user has seen starter tip for a command
 * @param query Query to use
 * @param userID ID of user to set
 * @param bitfield Bitfield value to set tips column to
 */
export async function setUserStarterTip (query: Query, userID: string, bitfield: number): Promise<void> {
	await query('UPDATE users_starter_tips SET tips = ? WHERE userId = ?', [bitfield, userID])
}

/**
 * Adds user to starter tips table so they can receive tips when they first run commands
 * @param query Query to use
 * @param userID ID of user to create row for
 */
export async function createStarterTipsRow (query: Query, userID: string): Promise<void> {
	await query('INSERT IGNORE INTO users_starter_tips (userId) VALUES (?)', [userID])
}

/**
 * @param query Query to use
 * @param category Column to get best players of
 * @param guild Eris guild object to fetch top players in guild
 * @returns User rows of top players in order DESC
 */
export async function getTopPlayers (query: Query, category: 'money' | 'level' | 'questsCompleted' | 'kills' | 'npcKills' | 'bossKills' | 'deaths', guild?: Guild): Promise<UserRow[]> {
	if (guild) {
		const guildMembers = guild.members.map(m => m.id)

		return query(`SELECT * FROM users WHERE userId IN (${guildMembers.join(', ') || '\'\''}) ORDER BY ${category} DESC LIMIT 20`)
	}

	return query(`SELECT * FROM users ORDER BY ${category} DESC LIMIT 10`)
}
