# BGA PHP Development

You are working on server-side PHP for a Board Game Arena game. The main files are:
- `modules/php/Game.php` — core game logic
- `modules/php/states.inc.php` — state machine definition
- `modules/php/material.inc.php` — static game data

## Class Structure

```php
<?php
declare(strict_types=1);
namespace Bga\Games\YourGameName;

use Bga\GameFramework\Components\Deck;

class Game extends \Bga\GameFramework\Table {
    public Deck $cards; // if using Deck component

    public function __construct() {
        parent::__construct();
        $this->cards = $this->deckFactory->createDeck("card"); // "card" = SQL table name
    }

    protected function setupNewGame(array $players, array $options = []): void { ... }
    protected function getAllDatas(): array { ... }
    public function getGameProgression(): int { ... }
}
```

## Key PHP Patterns
- Always use `$this->` (never `self::`) for method calls
- `declare(strict_types=1)` at top of every PHP file
- Namespace: `namespace Bga\Games\YourGameName;`
- PHP 8.4 features (typed properties, named args, match expressions) are available

## Exceptions
```php
throw new \Bga\GameFramework\UserException(clienttranslate("Player-visible error")); // user mistakes
throw new \Bga\GameFramework\SystemException("Internal bug description");             // dev bugs
throw new \Bga\GameFramework\VisibleSystemException("Visible system error");          // shown to player + logged
// Deprecated chain: feException → BgaUserException → \Bga\GameFramework\UserException (current)
```

## Notifications
```php
// Notify all players
$this->bga->notify->all('notifType', clienttranslate('${player_name} did ${action}'), [
    'player_name' => $player_name,
    'action' => 'something',
    'i18n' => ['action'], // mark translated fields
]);

// Notify one player
$this->bga->notify->player($player_id, 'notifType', clienttranslate('You drew a card'), [
    'card' => $card,
]);
// Old patterns: $this->notifyAllPlayers(...) / $this->notifyPlayer(...)
```

## Database Queries
```php
// Read multiple rows — returns array keyed by first column
$rows = $this->getCollectionFromDb("SELECT id, col FROM table WHERE condition");

// Read single value
$val = $this->getUniqueValueFromDb("SELECT col FROM table WHERE id = $id");

// Read single row
$row = $this->getObjectFromDb("SELECT * FROM table WHERE id = $id");

// Write
$this->DbQuery("UPDATE table SET col = $val WHERE id = $id");

// Always use intval/addslashes on user input before interpolating into SQL
$safe_id = intval($card_id);
```

## State Machine (states.inc.php)

```php
$machinestates = [
    1 => [
        "name" => "gameSetup",
        "description" => "",
        "type" => "manager",
        "action" => "stGameSetup",
        "transitions" => ["" => 2],
    ],
    2 => [
        "name" => "playerTurn",
        "description" => clienttranslate('${actplayer} must play a card'),
        "descriptionmyturn" => clienttranslate('You must play a card'),
        "type" => "activeplayer",
        "args" => "argPlayerTurn",      // method that returns data for client
        "possibleactions" => ["actPlayCard"],
        "transitions" => ["playCard" => 3, "zombiePass" => 3],
    ],
    // ...
    99 => ["name" => "gameEnd", "description" => "", "type" => "manager",
           "action" => "stGameEnd", "transitions" => []],
];
```

State types: `activeplayer` (one player acts), `multipleactiveplayer` (several act simultaneously), `game` (automated transition), `manager` (framework-managed).

## Player Action Handlers

```php
public function actPlayCard(int $card_id): void {
    // 1. Always validate turn first
    $this->checkAction('actPlayCard');

    // 2. Validate input
    $player_id = $this->getActivePlayerId();
    $card = $this->cards->getCard($card_id);
    if ($card === null || $card['location'] !== 'hand' || 
        (int)$card['location_arg'] !== (int)$player_id) {
        throw new \Bga\GameFramework\UserException(clienttranslate("Invalid card"));
    }

    // 3. Execute game logic
    $this->cards->moveCard($card_id, 'discard');

    // 4. Notify
    $this->bga->notify->all('cardPlayed', clienttranslate('${player_name} played a card'), [
        'player_name' => $this->getPlayerNameById($player_id), // getActivePlayerName() deprecated
        'card' => $card,
    ]);

    // 5. Transition
    $this->gamestate->nextState('playCard');
}
```

## State Action/Arg Methods

```php
// Called on state entry (stXxx naming convention)
public function stResolveTrick(): void {
    // automated game logic, then transition
    $this->gamestate->nextState('nextRound');
}

// Args passed to client for a state (argXxx naming convention)
public function argPlayerTurn(): array {
    return [
        'playableCards' => array_keys($this->getPlayableCards()),
    ];
}
```

## Useful Helpers
```php
$this->getActivePlayerId()                          // current active player's ID
$this->getPlayerNameById($this->getActivePlayerId()) // player name — getActivePlayerName() is deprecated
$this->getPlayerNameById($id)
$this->getPlayerColorById($id)                      // getActivePlayerColor() / getCurrentPlayerColor() deprecated
$this->loadPlayersBasicInfos()      // all players info array
$this->getPlayersNumber()
$this->gamestate->changeActivePlayer($player_id)
$this->gamestate->setAllPlayersMultiactive()
$this->gamestate->nextState('transitionName')
```

## setupNewGame Pattern
```php
protected function setupNewGame(array $players, array $options = []): void {
    // Initialize player data
    foreach ($players as $player_id => $player) {
        $this->DbQuery("INSERT INTO player (player_id, player_score) VALUES ($player_id, 0)");
    }

    // Create and deal cards using Deck component
    $cards = [];
    foreach ($this->card_types as $type_id => $type) {
        $cards[] = ['type' => $type_id, 'type_arg' => 0, 'nbr' => $type['count']];
    }
    $this->cards->createCards($cards, 'deck');
    $this->cards->shuffle('deck');

    // Deal cards to players
    foreach ($players as $player_id => $player) {
        $this->cards->pickCards(5, 'deck', $player_id);
    }

    $this->activeNextPlayer();
}
```
