ALTER TABLE users DROP COLUMN npckills;
ALTER TABLE users ADD COLUMN npcKills INT NOT NULL DEFAULT 0 AFTER deaths;
