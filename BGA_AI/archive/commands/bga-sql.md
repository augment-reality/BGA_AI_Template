# BGA SQL / Database Schema

You are working on `dbmodel.sql` for a Board Game Arena game. This file defines the MySQL schema for the game's persistent state.

## File Structure
`dbmodel.sql` contains `CREATE TABLE` statements only. BGA manages the database lifecycle. Do not include `DROP TABLE`, `INSERT`, or procedural SQL.

## Required Tables

### Player table extension
```sql
ALTER TABLE `player`
    ADD `player_score_aux` INT NOT NULL DEFAULT 0;
-- Add game-specific player columns here
-- The base player table already has: player_id, player_score, player_name, etc.
```

### Deck Component Card Table
If using the Deck PHP component, create the card table it expects:
```sql
CREATE TABLE IF NOT EXISTS `card` (
    `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `card_type` VARCHAR(16) NOT NULL,
    `card_type_arg` INT NOT NULL,
    `card_location` VARCHAR(32) NOT NULL,
    `card_location_arg` INT NOT NULL,
    PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
The table name passed to `$this->deckFactory->createDeck("card")` must match. The columns must follow `card_*` prefix pattern (e.g., table `card` → columns `card_id`, `card_type`, etc.; table `token` → `token_id`, `token_type`, etc.).

> **BGA Studio schema changes:** `CREATE TABLE IF NOT EXISTS` won't alter an existing table. If you add or rename a column, you must wipe the game DB in BGA Studio (request a clean table) so it is rebuilt from the updated `dbmodel.sql`.

### Custom Game State Tables
```sql
CREATE TABLE IF NOT EXISTS `trick` (
    `trick_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `player_id` INT UNSIGNED NOT NULL,
    `suit` TINYINT NOT NULL,
    `value` TINYINT NOT NULL,
    PRIMARY KEY (`trick_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Common Patterns

### Tracking a quantity per player
```sql
-- Usually done by adding a column to the player table via ALTER TABLE
ALTER TABLE `player`
    ADD `player_hand_size` INT NOT NULL DEFAULT 0,
    ADD `player_tricks_won` INT NOT NULL DEFAULT 0;
```

### Game-level state (single row)
```sql
CREATE TABLE IF NOT EXISTS `global_var` (
    `name` VARCHAR(32) NOT NULL,
    `value` VARCHAR(255),
    PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Board/grid state
```sql
CREATE TABLE IF NOT EXISTS `board` (
    `x` TINYINT NOT NULL,
    `y` TINYINT NOT NULL,
    `player_id` INT UNSIGNED,
    `piece_type` TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`x`, `y`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## PHP Query Patterns (reference)
```php
// Reading
$rows = $this->getCollectionFromDb("SELECT player_id, player_score FROM player");
$val  = $this->getUniqueValueFromDb("SELECT player_score FROM player WHERE player_id = $id");
$row  = $this->getObjectFromDb("SELECT * FROM trick WHERE trick_id = $id");

// Writing — always sanitize inputs
$player_id = intval($player_id);
$suit      = intval($suit);
$this->DbQuery("INSERT INTO trick (player_id, suit, value) VALUES ($player_id, $suit, $value)");
$this->DbQuery("UPDATE player SET player_score = player_score + 1 WHERE player_id = $player_id");
$this->DbQuery("DELETE FROM trick WHERE trick_id = $id");
```

## Euro Game Token Model

For games with resources (wood, gold, workers) rather than cards, a flexible `(token_key, location, state)` schema often beats creating one table per resource type:

```sql
CREATE TABLE IF NOT EXISTS `token` (
    `token_key`  VARCHAR(32) NOT NULL,    -- unique ID, e.g. 'wood_1', 'worker_p1_a'
    `token_type` VARCHAR(16) NOT NULL,    -- 'wood', 'worker', 'coin'
    `location`   VARCHAR(32) NOT NULL,    -- 'supply', 'board_3_4', 'player_1'
    `state`      INT NOT NULL DEFAULT 0,  -- used/unused, face-up/down, value, etc.
    PRIMARY KEY (`token_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Variant — with x/y position for board placement:**
```sql
CREATE TABLE IF NOT EXISTS `token` (
    `token_key`  VARCHAR(32) NOT NULL,
    `token_type` VARCHAR(16) NOT NULL,
    `location`   VARCHAR(32) NOT NULL,
    `location_arg` INT NOT NULL DEFAULT 0,  -- player_id, slot, or position
    `state`      TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (`token_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**PHP usage:**
```php
// Place a worker
$this->DbQuery("UPDATE token SET location = 'board_3_4' WHERE token_key = 'worker_p{$player_id}_a'");

// Count available workers for a player
$count = $this->getUniqueValueFromDb(
    "SELECT COUNT(*) FROM token WHERE token_type = 'worker' AND location = 'supply_{$player_id}'"
);

// Get all tokens at a board location
$tokens = $this->getCollectionFromDb(
    "SELECT * FROM token WHERE location = 'board_3_4'"
);
```

The token_key approach lets you track individual pieces (useful for animations — each piece has a stable ID the client can reference).

## Data Type Guidelines
- Player IDs: `INT UNSIGNED` (BGA uses large integers)
- Flags/small enums: `TINYINT`
- Card/piece types: `VARCHAR(16)` or `TINYINT`
- Positions/coordinates: `TINYINT` or `SMALLINT`
- Scores: `INT`
- Always use `NOT NULL` with a `DEFAULT` where appropriate
- Use `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` on every table
