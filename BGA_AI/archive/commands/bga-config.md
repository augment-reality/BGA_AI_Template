# BGA Configuration Files (JSONC)

You are working on BGA configuration files. These use JSONC format (JSON with `//` comments). The three main config files are `gameinfos.jsonc`, `gameoptions.jsonc`, and `stats.jsonc`.

## gameinfos.jsonc
Metadata about the game. Most fields are set once and rarely changed.

```jsonc
{
    // Game name (displayed on BGA)
    "game_name": "Your Game Name",

    // Your BGA username
    "publisher": "your_bga_username",
    "publisher_website": "https://yourwebsite.com",

    // Min/max number of players
    "players": [2, 3, 4],

    // Approximate play time in minutes
    "playing_time": 30,

    // Weight: 1=Light, 2=Medium-Light, 3=Medium, 4=Medium-Heavy, 5=Heavy
    "weight": 2,

    // Category tags (see BGA docs for full list)
    "categories": ["card_game", "abstract"],

    // Mechanisms used
    "mechanisms": ["hand_management", "trick_taking"],

    // If the game supports "fast" mode (recommended for simple games)
    "is_beta": 1,
    "is_coop": 0,
    "is_solo": 0,

    // Language dependency: 0=none, 1=some text, 2=extensive text
    "language_dependency": 0,

    // Complexity: number of unique decisions per turn (rough estimate)
    "complexity": 2,

    "luck": 3,        // 0-5, how much luck matters
    "strategy": 3,    // 0-5, how much strategy matters
    "diplomacy": 0,   // 0-5, player interaction/negotiation
}
```

## gameoptions.jsonc
Defines optional game variants shown in the game setup lobby.

```jsonc
{
    "options": {
        // Option IDs must be >= 100 (BGA reserves lower IDs)
        "100": {
            "name": "Hand size",
            "values": {
                "1": { "name": "5 cards", "tmdisplay": "5 cards" },
                "2": { "name": "7 cards", "tmdisplay": "7 cards", "nobeginner": true },
            },
            "default": "1",
            "displaycondition": []
        },

        "101": {
            "name": "Special rules variant",
            "values": {
                "0": { "name": "Standard" },
                "1": { "name": "Variant A" },
                "2": { "name": "Variant B" }
            },
            "default": "0"
        }
    },

    // Game preferences (per-player visual/UI settings, not game rules)
    "preferences": {
        "100": {
            "name": "Card display",
            "needReload": false,
            "values": {
                "1": { "name": "Fan" },
                "2": { "name": "Row" }
            },
            "default": "1"
        }
    }
}
```

### Reading options in PHP
```php
// In setupNewGame():
$hand_size = $options[100] ?? 1;

// In any game method:
$option_val = $this->getGameStateValue('option_100'); // returns int
```

### Reading preferences in JS
```js
const pref = this.prefs[100].value; // 1 or 2
```

## stats.jsonc
Defines statistics tracked per-game (shown in the end-of-game results).

```jsonc
{
    "player": {
        // Per-player stats (each player gets their own value)
        "cards_played": {
            "id": 10,
            "name": "Cards played",
            "type": "int"
        },
        "tricks_won": {
            "id": 11,
            "name": "Tricks won",
            "type": "int"
        }
    },

    "table": {
        // Table-wide stats (one value for the whole game)
        "total_rounds": {
            "id": 10,
            "name": "Total rounds played",
            "type": "int"
        }
    }
}
```

Stat types: `"int"` or `"float"`.

### Using stats in PHP
```php
// Increment a stat
$this->incStat(1, 'cards_played', $player_id);   // player stat
$this->incStat(1, 'total_rounds');                 // table stat

// Set a stat to a specific value
$this->setStat(7, 'tricks_won', $player_id);
```

## JSONC Notes
- Comments (`// ...`) are allowed and ignored by the parser
- Trailing commas in objects/arrays are NOT allowed (standard JSON rule)
- All string values that players see should be in English; BGA handles i18n separately
