# BGA Deck PHP Component

You are working with the BGA `Deck` PHP component for server-side card management. It handles card storage, movement, and retrieval without writing direct SQL for card operations.

## Setup

### dbmodel.sql — required card table
```sql
CREATE TABLE IF NOT EXISTS `card` (
    `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `card_type` VARCHAR(16) NOT NULL,
    `card_type_arg` INT NOT NULL,
    `card_location` VARCHAR(32) NOT NULL,
    `card_location_arg` INT NOT NULL,
    PRIMARY KEY (`card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```
The column prefix must match the table name (e.g., table `token` → columns `token_id`, `token_type`, etc.).

### Game.php initialization
```php
use Bga\GameFramework\Components\Deck;

public Deck $cards;

public function __construct() {
    parent::__construct();
    $this->cards = $this->deckFactory->createDeck("card"); // "card" = SQL table name
    // Old pattern (deprecated): $this->getNew("module.common.deck") then ->init("card")
}
```

## Card Properties
Each card is an associative array:
```php
[
    'id'           => 42,          // auto-generated, unique
    'type'         => 'hearts',    // short string (card category)
    'type_arg'     => 7,           // integer variant (e.g., card value)
    'location'     => 'hand',      // current location string
    'location_arg' => 1234567,     // integer (player_id for hands, order for piles)
]
```

## Creating Cards (in setupNewGame)
```php
$cards = [];
foreach ($this->card_types as $type => $info) {
    for ($value = 1; $value <= 13; $value++) {
        $cards[] = ['type' => $type, 'type_arg' => $value, 'nbr' => 1];
    }
}
// Also supports 'nbr' shorthand for multiple identical cards:
$cards[] = ['type' => 'wild', 'type_arg' => 0, 'nbr' => 4];

$this->cards->createCards($cards, 'deck');    // all go to 'deck' location
$this->cards->shuffle('deck');
```

## Picking Cards (deck → hand)
```php
// Pick 1 card from 'deck' to player's hand (location_arg = player_id)
$card = $this->cards->pickCard('deck', $player_id);           // returns card or null

// Pick N cards from 'deck' to player's hand
$drawn = $this->cards->pickCards(5, 'deck', $player_id);      // returns array of cards

// Pick card to any location (not just 'hand')
$card = $this->cards->pickCardForLocation('deck', 'play_area', 0);

// Pick N cards to any location
$cards = $this->cards->pickCardsForLocation(3, 'deck', 'river', 0);
```

## Moving Cards
```php
// Move a single card
$this->cards->moveCard($card_id, 'discard');
$this->cards->moveCard($card_id, 'hand', $player_id);    // location_arg = player_id

// Move multiple cards
$this->cards->moveCards($card_ids_array, 'discard');

// Move all cards from one location to another
$this->cards->moveAllCardsInLocation('hand', 'discard', $from_player_id, 0);
// $from_location_arg = null moves ALL cards regardless of location_arg

// Keep location_arg when moving (preserves order)
$this->cards->moveAllCardsInLocationKeepOrder('temp', 'hand');

// Insert at specific position in an ordered pile
$this->cards->insertCard($card_id, 'deck', 5);               // position 5
$this->cards->insertCardOnExtremePosition($card_id, 'deck', true);  // top
$this->cards->insertCardOnExtremePosition($card_id, 'deck', false); // bottom

// Move card to top of 'discard'
$this->cards->playCard($card_id);
```

## Querying Cards
```php
// Get a single card
$card = $this->cards->getCard($card_id);          // returns array or null

// Get multiple specific cards by ID
$cards = $this->cards->getCards([1, 2, 3]);        // keyed by card_id

// Get all cards in a location
$hand = $this->cards->getCardsInLocation('hand', $player_id);      // keyed by card_id
$deck = $this->cards->getCardsInLocation('deck');                   // all in deck

// With ordering
$pile = $this->cards->getCardsInLocation('deck', null, 'location_arg');

// Shorthand for player hand
$hand = $this->cards->getPlayerHand($player_id);

// Top card(s) without moving
$top = $this->cards->getCardOnTop('deck');
$tops = $this->cards->getCardsOnTop(3, 'deck');

// By type
$wilds = $this->cards->getCardsOfType('wild');
$hearts = $this->cards->getCardsOfTypeInLocation('hearts', null, 'hand', $player_id);

// Counts
$n    = $this->cards->countCardInLocation('deck');
$n_in_hand = $this->cards->countCardInLocation('hand', $player_id);
$all  = $this->cards->countCardsInLocations();        // array: location => count
$byArg = $this->cards->countCardsByLocationArgs('hand'); // array: player_id => count
```

## Shuffling
```php
$this->cards->shuffle('deck');  // randomizes order, resets location_arg values
```

## Auto-Reshuffle
When the deck runs out during a pick, automatically reshuffle the discard pile back into the deck:
```php
$this->cards->autoreshuffle = true;  // enable in constructor, after init()

// Optional: notify players when reshuffle happens
$this->cards->autoreshuffle_trigger = ['obj' => $this, 'method' => 'reshuffleTriggered'];

// Custom location pair (default is 'discard' → 'deck')
$this->cards->autoreshuffle_custom = ['discard' => 'deck'];
```

## Common Patterns

### Deal N cards to each player
```php
foreach ($players as $player_id => $player) {
    $this->cards->pickCards(5, 'deck', $player_id);
}
```

### Play a card from hand
```php
public function actPlayCard(int $card_id): void {
    $this->checkAction('actPlayCard');
    $card = $this->cards->getCard($card_id);
    if ($card['location'] !== 'hand' || (int)$card['location_arg'] !== (int)$this->getActivePlayerId()) {
        throw new \BgaUserException(self::_("This card is not in your hand"));
    }
    $this->cards->moveCard($card_id, 'played', $this->getActivePlayerId());
    // notify, transition...
}
```

### Collect all played cards to discard
```php
$this->cards->moveAllCardsInLocation('played', 'discard');
```

### Send card data to clients (getAllDatas)
```php
protected function getAllDatas(): array {
    $player_id = $this->getCurrentPlayerId();
    return [
        // Only send THIS player's hand (hidden info)
        'hand' => $this->cards->getPlayerHand($player_id),
        // Public info: card counts per player
        'hand_counts' => $this->cards->countCardsByLocationArgs('hand'),
        // Face-up cards in play area
        'played' => $this->cards->getCardsInLocation('played'),
    ];
}
```
