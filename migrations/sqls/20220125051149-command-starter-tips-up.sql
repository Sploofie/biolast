CREATE TABLE IF NOT EXISTS users_starter_tips (
	userId VARCHAR(255) NOT NULL,
	tips INT NOT NULL DEFAULT 0,
	PRIMARY KEY (userId)
) ENGINE = InnoDB;
