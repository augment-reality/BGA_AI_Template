# BGA Studio Troubleshooting

You are diagnosing errors in a Board Game Arena game. This skill covers the most common errors at each stage of development.

## IDE false positives for BGA PHP types

When working on BGA games in VS Code (or any PHP language server), you will see **red error squiggles** on nearly every line that references the BGA framework:

- `Undefined type 'Bga\GameFramework\Table'`
- `Undefined type 'Bga\GameFramework\StateType'`
- `Undefined property '$bga'`
- `Undefined method 'getCollectionFromDb'`
- `Undefined function 'clienttranslate'`

**These are all false positives.** The BGA PHP framework has no PHP type stubs that the language server can read. All framework classes, properties, and global functions (`clienttranslate`, `bga_rand`, etc.) exist at runtime on the BGA server but are invisible to the local IDE.

**What to do:** Ignore them. They affect every BGA PHP file equally — including the official template files. They do not indicate real bugs. Only act on errors that also appear in the BGA Studio error log when you run the game.

---

## Critical note: new vs. legacy framework

The official troubleshooting docs are written for the **legacy** framework (`states.inc.php`, `view.php`, `action.php`, `.tpl`). If you are using the **new** framework (class-based states, `modules/php/Game.php`, `this.bga.*` JS API), many of those file references do not apply. Translate legacy advice as follows:

| Legacy doc refers to… | New framework equivalent |
|---|---|
| `states.inc.php` | State class `onEnteringState()` / action return values |
| `yourgamename.action.php` | Not needed — actions routed via `#[PossibleAction]` attribute |
| `yourgamename.view.php` | Not needed — view injected via `setup()` in Game.js |
| `yourgamename.tpl` / `format_block()` | Not needed — HTML built in JS |
| `$this->nextState('name')` | `return NextStateName::class` |

---

## Game creation failures (createGame / setupNewGame)

### "Legacy game module not found: gamename.game.php"
The BGA server cannot find the root entry-point PHP file. This is required even in the new framework.

**Fix:**
1. Create `fujiflushnew.game.php` at the project root (next to `modules/`, `dbmodel.sql`, etc.):
```php
<?php
declare(strict_types=1);
require_once(APP_GAMEMODULE_PATH . 'module/table/table.game.php');
require_once('modules/php/Game.php');
```
2. **Upload it manually** — `uploadOnSave` in the VS Code SFTP extension only triggers when you save through the VS Code editor (Ctrl+S). Files written by external tools (Claude Code, scripts) are not automatically synced. Right-click the file → Upload, or run "SFTP: Sync Local → Remote" from the command palette.

### "BGA service error" / "Fatal error during setup"
Multiple causes — check in this order:
1. **dbmodel.sql syntax error** — run a syntax check; a missing comma or wrong column type prevents table creation
2. `setupNewGame()` PHP error — add `error_log()` calls to narrow it down
3. `gameinfos.jsonc` JSON syntax error — validate the file (JSONC allows `//` comments but not trailing commas)
4. Deck component not initialized — ensure `$this->cards = $this->deckFactory->createDeck("card")` is in `__construct()`, not in `setupNewGame()`

### "Wrong formatted data from BGA gameserver"
PHP syntax error in a loaded file. BGA catches the parse error but shows a generic message.
- Check `Game.php`, all State files, and any includes for syntax errors
- PHP 8 strict types (`declare(strict_types=1)`) will surface type mismatches that were previously silent

### "Fatal error: database creation failed" / "Fatal error: Not logged"
Using `getCurrentPlayerId()` or `$g_user` in `setupNewGame()` or an `args*` state function. These are not available outside of player action context.
- In `setupNewGame()`: use `array_keys($players)` to iterate player IDs
- In state args: use `$this->getActivePlayerId()`

### "Unknown player statistic" / "Duplicate entry in stats table"
Stats defined in `stats.jsonc` that are not initialized, or two stats with the same ID.

---

## Action / move errors

### "Move recorded, waiting for update..." (spinner forever)
The PHP action ran successfully but sent no notification. BGA waits for a `notify->all()` or `notify->player()` before updating the client.
- Every code path in an action method must send at least one notification

### "This move not authorized now"
The action name called from JS doesn't match a `#[PossibleAction]` method in the current state class.
- In new framework: verify the method name in the State class matches what `performAction('actXxx', ...)` sends
- The state must be `ACTIVE_PLAYER` type and the calling player must be active

### "Gameserver timeout" / "Sending move to server..." then reset
PHP infinite loop or recursion. Add `error_log()` checkpoints to locate the loop.

### "Unexpected final game state (XX)"
An action method returned without reaching a `return SomeState::class` (new framework) or `$this->nextState()` (legacy). All code paths must transition.

---

## Interface loading errors

### "Application loading..." with no detail
JavaScript syntax error — check the browser console (F12). Common causes:
- Missing `}` to close a method or class
- Trailing comma in the wrong place
- `export class Game` missing or misspelled

### "Uncaught ReferenceError: bgagame undefined"
Major JS syntax error or the game class isn't exported correctly.
- New framework: ensure `export class Game { ... }` is the named export in `modules/js/Game.js`
- If using the rollup build step, ensure `npm run build` has been run and `modules/js/Game.js` contains the bundled output, not the raw TS source

### Blank page / game area is empty
- `setup(gamedatas)` threw an error — check console
- `getAllDatas()` returned a PHP object instead of a plain array (BGA can't JSON-serialize class instances)

---

## Zombie mode errors

### "Propagating error: Not logged" in zombie
`zombieTurn()` (legacy) or the `zombie()` method (new framework) called `getCurrentPlayerId()`. Use the `$playerId` parameter instead.

### "Can't manage zombie in this state"
New framework: the State class needs a `zombie(int $playerId)` method that returns the next state class.

---

## Sync / upload issues (VS Code + SFTP extension)

- `"uploadOnSave": true` only triggers when you save a file **through VS Code** (Ctrl+S in the editor). External writes (Claude Code, scripts, git checkout) do NOT auto-upload.
- After Claude Code creates or edits a file: right-click it in the Explorer → **Upload**, or use **SFTP: Sync Local → Remote** from the command palette.
- Verify the upload succeeded — the SFTP extension shows a status bar message and logs to the Output panel (View → Output → SFTP).

---

## New framework: checklist before first test

- [ ] `fujiflushnew.game.php` exists at project root and has been uploaded
- [ ] `dbmodel.sql` has the card table (if using Deck component)
- [ ] `gameinfos.jsonc` has correct player count range and valid JSON
- [ ] `modules/php/Game.php` constructor calls `$this->deckFactory->createDeck(...)` if using cards
- [ ] `setupNewGame()` ends with `$this->activeNextPlayer(); return SomeState::class;`
- [ ] Each State class has `#[PossibleAction]` on every action method
- [ ] Action methods always `return NextState::class` on every code path
- [ ] `modules/js/Game.js` exports `class Game` and `setup(gamedatas)` is defined
- [ ] All files have been uploaded (not just saved locally)
