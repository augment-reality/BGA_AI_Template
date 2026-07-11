# BGA Modular PHP Organization

You are working on a BGA game that splits server-side logic across multiple PHP files. This is the recommended approach for games with complex mechanics that would make a single `Game.php` unwieldy.

## Standard File Layout

```
modules/
  php/
    Game.php          ← Main class, entry point, keeps __construct / setup / getAllDatas
    material.inc.php  ← Static data arrays (card types, tile definitions, etc.)
    states.inc.php    ← $machinestates definition
    Pirates.php       ← Trait with pirate-power methods (example from Skull King)
    Pending.php       ← Helper class for pending action queue (example)
    Scoring.php       ← Scoring logic as a trait or helper class
```

Only `Game.php` needs to be a class extending `\Table`. Everything else can be traits, plain classes, or include files.

## PHP Traits for Feature Modules

Traits are the cleanest way to split `Game.php` without a complex class hierarchy. Each trait adds methods to `Game` as if they were written directly there.

```php
// modules/php/ScoringTrait.php
<?php
declare(strict_types=1);
namespace Bga\Games\YourGameName;

trait ScoringTrait {
    protected function calculateRoundScore(int $player_id): int {
        // $this-> works here — trait methods have access to the Game object
        $tricks = (int)$this->getUniqueValueFromDb(
            "SELECT player_tricks FROM player WHERE player_id = $player_id"
        );
        return $tricks * 10;
    }

    protected function endRound(): void {
        foreach ($this->loadPlayersBasicInfos() as $player_id => $_) {
            $score = $this->calculateRoundScore($player_id);
            $this->DbQuery("UPDATE player SET player_score = player_score + $score WHERE player_id = $player_id");
            $this->bga->notify->all('scoreUpdated', '', ['player_id' => $player_id, 'score' => $score]);
        }
    }
}
```

```php
// modules/php/Game.php
<?php
declare(strict_types=1);
namespace Bga\Games\YourGameName;

include 'ScoringTrait.php';

class Game extends \Table {
    use ScoringTrait;   // all trait methods are now part of Game

    // __construct, setupNewGame, getAllDatas, etc.
    // stEndRound() can call $this->endRound() from the trait
}
```

## material.inc.php Pattern

Static game data that never changes during play. Loaded in `__construct` via `require`:

```php
// modules/php/material.inc.php
<?php
// No namespace, no class — just array assignments to $this
$this->card_types = [
    'hearts'   => ['label' => clienttranslate('Hearts'),   'color' => 'red'],
    'spades'   => ['label' => clienttranslate('Spades'),   'color' => 'black'],
    'diamonds' => ['label' => clienttranslate('Diamonds'), 'color' => 'red'],
    'clubs'    => ['label' => clienttranslate('Clubs'),    'color' => 'black'],
];

$this->special_cards = [
    1 => ['type' => 'skull_king', 'label' => clienttranslate('Skull King')],
    2 => ['type' => 'escape',     'label' => clienttranslate('Escape')],
];
```

```php
// In Game.php __construct():
public function __construct() {
    parent::__construct();
    require 'material.inc.php';  // assigns $this->card_types, etc.
}
```

## Static $instance Pattern

When a helper class (not a trait) needs to call Game methods, it cannot use `$this->`. Use a static singleton reference:

```php
// Game.php
class Game extends \Table {
    public static ?Game $instance = null;

    public function __construct() {
        parent::__construct();
        self::$instance = $this;
        // ...
    }
}

// Helper class (e.g., Pending.php)
class Pending {
    public function doSomething(): void {
        // Access Game methods via static reference
        $value = Game::$instance->getGameStateValue('round_number');
        Game::$instance->bga->notify->all('event', '', []);
    }
}
```

This pattern trades on the fact that only one `Game` instance ever exists per request. It's not elegant but it's common in existing BGA games. **Prefer traits over this pattern** when possible.

## Including Files

```php
// In Game.php — include files relative to the PHP file's location
include 'Pending.php';         // class or trait definition
require 'material.inc.php';    // executed immediately (assigns to $this)
require_once 'Pirates.php';    // safe to include multiple times
```

`include` — load and execute; non-fatal if missing  
`require` — load and execute; fatal if missing  
`require_once` — only loads once even if called multiple times

## states.inc.php Inclusion

`states.inc.php` is NOT included by `Game.php`. BGA loads it directly from the project root (or from the `modules/php/` path configured in `gameinfos.inc.php`). It must assign to `$machinestates` as a plain PHP script.

```php
// states.inc.php — no namespace, no class
<?php
$machinestates = [
    1 => [...],
    2 => [...],
];
```

## Helper Classes vs Traits

| Approach | When to use |
|---|---|
| **Trait** | Methods that need `$this->` (DB queries, notifications, game state). Cleanest option. |
| **Helper class + static $instance** | When the helper needs its own state/constructor logic, or when organizing by game object (e.g., a `Deck` wrapper with its own methods). |
| **material.inc.php** | Read-only static data. Always use this pattern for card/piece definitions. |
| **Plain include** | When you need to break up a file but the code is still logically part of Game (e.g., scoring block). |

## Trait Design Guidelines

- Keep each trait focused: one trait per major game feature (`ScoringTrait`, `CardPlayTrait`, `SetupTrait`)
- Traits can use `$this->` freely — they operate on the Game object
- Don't put `__construct` logic in traits; do it in `Game::__construct`
- If a trait method is only called from `Game`, declare it `protected`
- If it's called externally (e.g., from a helper), declare it `public`

## Undo / Savepoints

BGA supports optional undo of the last player action via savepoints:

```php
// Save a restore point at the START of an undoable action
public function actMoveEnergy(int $from, int $to): void {
    $this->checkAction('actMoveEnergy');

    // Save state before changes (so undo can revert here)
    if ($this->getGameStateValue('withUndo') == 1) {
        try { $this->undoSavepoint(); } catch (\Exception $e) {}
    }

    // ... apply game logic ...
}

// Restore to the last savepoint (triggered by actUndo player action)
public function actUndo(): void {
    $this->checkAction('actUndo');
    $this->undoRestorePoint();
    // Framework reverts DB to savepoint; re-enters the state
}
```

`undoSavepoint()` — marks a rollback point in the current transaction  
`undoRestorePoint()` — rolls DB back to the last savepoint and replays the state  
Wrap in `try/catch` since the first call in a session may fail if no prior savepoint exists.
