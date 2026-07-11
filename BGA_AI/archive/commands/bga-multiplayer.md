# BGA Multiplayer States — Simultaneous Actions & Private States

You are working on BGA game mechanics that involve multiple players acting simultaneously, private hidden choices (like bidding), or parallel turn structures.

## State Types Recap

| Type | When to use |
|---|---|
| `activeplayer` | One specific player acts |
| `multipleactiveplayer` | Several (or all) players act simultaneously |
| `game` | Automated logic, no player interaction |
| `private` | Sub-state visible only to one player within a multi state |

## multipleactiveplayer State

```php
4 => [
    "name" => "playerTurnMulti",
    "description" => clienttranslate('The other players must perform their actions'),
    "descriptionmyturn" => clienttranslate('${you} must take an action'),
    "type" => "multipleactiveplayer",
    "initialprivate" => 50,         // optional: route each player to their own private state
    "action" => "stMultiPlayerActivation",
    "possibleactions" => ["actPlayCard", "actPass"],
    "transitions" => [
        "next" => 5,                // all players done → next state
        "same" => 4,                // stay in multi state (player finished but others haven't)
        "zombiePass" => 4,          // zombie auto-passes within multi state
        "end" => 99
    ]
],
```

### PHP action: entering multipleactiveplayer
```php
public function stMultiPlayerActivation(): void {
    // Make all players active, or a subset:
    $this->gamestate->setAllPlayersMultiactive();
    // Or specific players:
    // $this->gamestate->setPlayersMultiactive([$player1_id, $player2_id], 'zombiePass');
}
```

### PHP: when a player finishes their action in a multi state
```php
public function actPlayCard(int $card_id): void {
    $this->checkAction('actPlayCard');
    // ... game logic ...

    // Mark this player as done
    $this->gamestate->setPlayerNonMultiactive($this->getCurrentPlayerId(), 'next');
    // 'next' is the transition used when ALL players are done
    // If players remain: stays in multipleactiveplayer
    // If last player: transitions to state 'next'
}
```

### Zombie handling in multi states
```php
public function zombieTurn(array $state, int $active_player): void {
    if ($state['name'] === 'playerTurnMulti') {
        $this->gamestate->setPlayerNonMultiactive($active_player, 'zombiePass');
    }
}
```

## Private States (hidden per-player sub-states)

Private states let each player in a `multipleactiveplayer` state have their own state progression invisible to others. Bidding phases are the classic use case.

```php
// The multipleactiveplayer state routes each player to private state 50:
4 => [
    "type" => "multipleactiveplayer",
    "initialprivate" => 50,  // each player starts here independently
    ...
],

// Private state: player chooses their bid (only they see this)
50 => [
    "name" => "playerBid",
    "descriptionmyturn" => clienttranslate('${you} must choose your bid'),
    "type" => "private",
    "args" => "argBid",
    "possibleactions" => ["actChooseBid"],
    "transitions" => [
        "confirm" => 51,        // player moves to confirmation sub-state
        "zombiePass" => 4       // zombie exits back to multi state
    ]
],

// Private state: player confirms their bid
51 => [
    "name" => "playerConfirmBid",
    "descriptionmyturn" => clienttranslate('${you} must confirm your bid'),
    "type" => "private",
    "args" => "argConfirmBid",
    "possibleactions" => ["actConfirmBid", "actBackToBid"],
    "transitions" => [
        "backtochoosebid" => 50,
        "zombiePass" => 4
    ]
],
```

### Transitioning within a private state
```php
public function actChooseBid(int $bid): void {
    $this->checkAction('actChooseBid');
    // Save bid privately (to DB, NOT to a game state visible to all)
    $player_id = $this->getCurrentPlayerId();
    $this->DbQuery("UPDATE player SET player_bid = $bid WHERE player_id = $player_id");

    // Move THIS player to the next private state
    $this->gamestate->nextPrivateState('confirm');
}

public function actConfirmBid(): void {
    $this->checkAction('actConfirmBid');
    // Player is done — exit private states back to multipleactiveplayer
    $this->gamestate->setPlayerNonMultiactive($this->getCurrentPlayerId(), 'next');
}
```

### Reading private state args on the client
```js
onEnteringState(stateName, args) {
    // args.args contains the public state args
    // args.args._private contains private state args (only visible to this player)
    const privateArgs = args.args._private;
}
```

## JS: Handling Multi / Private States

```js
onEnteringState(stateName, args) {
    switch (stateName) {
        case 'playerTurnMulti':
            // All active players see this — show generic waiting UI
            break;
        case 'playerBid':
            // Only the active player sees this (private state)
            // Show bid selection UI
            this.showBidOptions(args.args._private);
            break;
    }
},

onUpdateActionButtons(stateName, args) {
    // isCurrentPlayerActive() is true for EACH active player in a multi state
    if (this.bga.players.isCurrentPlayerActive()) {
        if (stateName === 'playerBid') {
            // Each player adds their own buttons independently
        }
    }
},
```

## getAllDatas — Hiding Private Information

```php
protected function getAllDatas(): array {
    $current_player = $this->getCurrentPlayerId();
    return [
        // Public: all bids after bidding phase is done
        'bids' => $this->getBidsIfRevealed(),
        // Private: only this player's own bid during bidding
        'my_bid' => $this->getPlayerBid($current_player),
        // Never expose other players' unrevealed bids
    ];
}
```

## Common Patterns

### Wait for all players (simultaneous play)
Use `multipleactiveplayer` + `setAllPlayersMultiactive()`. Each player calls an action that ends with `setPlayerNonMultiactive(..., 'next')`. The framework triggers the `next` transition only after the last player finishes.

### Secret simultaneous choices (bidding)
Use `multipleactiveplayer` with `initialprivate`. Each player moves through private states independently. When all have called `setPlayerNonMultiactive`, the game proceeds to a reveal state.

### One player needs to react to another's play
Use a `game` state that checks whether a reaction is needed, then transitions to either `activeplayer` (reaction required) or skips ahead.
