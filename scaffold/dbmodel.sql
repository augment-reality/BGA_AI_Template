
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- Your Game Name implementation
-- ------

-- ⚠ SCHEMA-CHANGE TRAP: `CREATE TABLE IF NOT EXISTS` does NOT alter an existing table,
-- and "restart test table" does NOT rebuild the schema. After ANY change to this file,
-- start a NEW table in BGA Studio so the schema is rebuilt.

-- Card deck (BGA Deck component). Column prefix MUST match the table name.
-- Delete this table if the game has no cards (and remove the deckFactory call in Game.php).
CREATE TABLE IF NOT EXISTS `card` (
  `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `card_type` VARCHAR(16) NOT NULL,
  `card_type_arg` INT NOT NULL DEFAULT 0,
  `card_location` VARCHAR(32) NOT NULL,
  `card_location_arg` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

-- Game-specific player columns (the base player table already has player_id,
-- player_score, player_name, player_color, ...):
-- ALTER TABLE `player` ADD `player_resource` INT NOT NULL DEFAULT 0;
