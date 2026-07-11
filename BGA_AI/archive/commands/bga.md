# BGA Studio Developer Context

You are helping develop a Board Game Arena (BGA) game. BGA uses a strict client-server architecture where the **server (PHP) is authoritative** — all game rule enforcement happens in PHP. Never trust client data.

## File Structure (New Architecture)
```
modules/
  php/
    Game.php          — Main game class (PHP 8.4, namespaced)
    states.inc.php    — State machine definition ($machinestates array)
    material.inc.php  — Static game data (card types, piece definitions, etc.)
dbmodel.sql           — MySQL schema
modules/js/
  Game.js             — ES6 class, client-side interface logic
*.css                 — Styling
gameinfos.jsonc       — Game metadata
gameoptions.jsonc     — Game options/preferences
stats.jsonc           — Statistics definitions
```

## Core Concepts

**State Machine**: The game runs as a state machine. Each state defines which player(s) act, what actions are allowed, and what transitions occur. States are defined in `states.inc.php`, PHP action handlers in `Game.php`, and client-side handlers in `Game.js`.

**Notification System**: The server notifies clients of game events via notifications. PHP sends them; JS subscribes and updates the UI.

**Deck Component**: PHP component for card management. See `/bga-deck`.

**Stock Component**: JS component for displaying sets of game elements. See `/bga-stock`.

## New vs Old API (Migration Guide)
BGA migrated to a modern architecture. Always use the new patterns:

| Old | New |
|-----|-----|
| `self::methodName()` | `$this->methodName()` |
| `$this->notifyAllPlayers(...)` | `$this->bga->notify->all(...)` |
| `feException` / `BgaUserException` | `\Bga\GameFramework\UserException` |
| `BgaSystemException` | `\Bga\GameFramework\SystemException` |
| `$this->getActivePlayerName()` | `$this->getPlayerNameById($this->getActivePlayerId())` |
| `$this->getNew("module.common.deck")` | `$this->deckFactory->createDeck("tablename")` |
| `ajaxcall(...)` / `bgaPerformAction(...)` | `this.bga.actions.performAction(...)` in JS |
| `this.isCurrentPlayerActive()` in JS | `this.bga.players.isCurrentPlayerActive()` |
| `this.scoreCtrl[id]` in JS | `this.bga.playerPanels.getScoreCounter(id)` |
| `this.confirmationDialog(txt, cb)` | `await this.bga.dialogs.confirmation(txt)` |
| `gameoptions.inc.php` | `gameoptions.jsonc` |
| `stats.inc.php` | `stats.jsonc` |
| Dojo DOM manipulation | Vanilla JS |
| `action.php` | Autowired actions (no separate file) |
| `view.php` + `.tpl` | Optional; UI built client-side |

## Security
- Always call `$this->checkAction('actName')` at the start of every player action handler
- Validate all player inputs server-side before applying to game state
- Never expose hidden information (e.g., other players' hands) in `getAllDatas()`

## Related Skills
- `/bga-php` — PHP game logic, state machine, notifications
- `/bga-sql` — Database schema and queries
- `/bga-js` — JavaScript interface, `this.bga.*` API
- `/bga-css` — Styling patterns
- `/bga-config` — JSONC configuration files
- `/bga-deck` — Deck PHP component (card management)
- `/bga-stock` — Stock JS component (element display)
- `/bga-multiplayer` — Simultaneous actions, private states, bidding
- `/bga-animations` — slideToObject, attachToNewParent, tooltips
- `/bga-modules` — Traits, multi-file PHP, undo/savepoints
- `/bga-client-states` — Multi-step client interactions without server round-trips
- `/bga-logs` — HTML/images in notification logs
- `/bga-legacy` — Deciphering old docs and patterns
