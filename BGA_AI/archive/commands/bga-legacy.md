# BGA Legacy Patterns — Historical Perspective

You are reading BGA documentation, tutorials, or existing game code that uses **older patterns**. This skill helps you understand what you're looking at, what still works, and what should be written differently in new code.

BGA's documentation and many community examples were written before the 2023–2024 migration to the modern framework. Old and new code coexist; not everything old needs to be rewritten.

---

## File Structure: Old vs New

| Old (pre-migration) | New (current) | Notes |
|---|---|---|
| `yourgame.game.php` | `modules/php/Game.php` | Same class, different location |
| `yourgame.action.php` | *(eliminated)* | Actions are now autowired |
| `yourgame.view.php` | *(optional)* | UI can be built client-side |
| `yourgame_yourgame.tpl` | *(optional)* | Templates now optional |
| `gameoptions.inc.php` | `gameoptions.jsonc` | Config moved to JSON |
| `gamepreferences.inc.php` | `gameoptions.jsonc` (`preferences` key) | Merged |
| `stats.inc.php` | `stats.jsonc` | Config moved to JSON |
| `gameinfos.inc.php` | `gameinfos.jsonc` | Config moved to JSON |
| `yourgame.js` | `modules/js/Game.js` | Same logic, different location & format |

When you see references to `action.php` in tutorials, know that in new games those actions are handled directly in `Game.php` methods named `act*`.

---

## .tpl Template Files (Legacy UI System)

`.tpl` files define the static HTML skeleton of the game board in the old architecture. They use a Smarty-like syntax processed by BGA before the page loads.

### Basic structure
```smarty
{OVERALL_GAME_HEADER}

<div id="game_play_area">

    <!-- Static shared elements -->
    <div id="board">
        <div id="discard_pile"></div>
    </div>

    <!-- Per-player loop — BGA iterates once per player -->
    <!-- BEGIN player -->
    <div id="playertable_{PLAYER_ID}" class="playertable">
        <div class="playertablename" style="color:#{PLAYER_COLOR}">
            {PLAYER_NAME}
        </div>
        <div id="hand_{PLAYER_ID}"></div>
    </div>
    <!-- END player -->

</div>

<!-- JS templates for dynamically created elements -->
<script type="text/javascript">
var jstpl_card  = '<div class="card type_${type}" id="card_${id}"></div>';
var jstpl_token = '<div class="token ${color}" id="token_${id}"></div>';

// Player panel content (injected into each player's BGA panel on the right)
var jstpl_player_board = '<div class="cp_board" id="cp_board_${id}">\
    <div class="score" id="score_${id}">0</div>\
</div>';
</script>

{OVERALL_GAME_FOOTER}
```

### Template variables
| Variable | Value |
|---|---|
| `{OVERALL_GAME_HEADER}` / `{OVERALL_GAME_FOOTER}` | Required BGA wrapper markup |
| `{PLAYER_ID}` | Player's BGA ID (inside BEGIN/END player block) |
| `{PLAYER_NAME}` | Player's display name |
| `{PLAYER_COLOR}` | Player's hex color code (no `#`) |
| `{PLAYER_NO}` | Player order (1, 2, 3…) |
| `{DIR}` | Layout direction (set in `view.php`) |

### Using jstpl_ templates in JS
```js
// OLD — format_block instantiates a jstpl_ variable
const html = this.format_block('jstpl_card', { id: 42, type: 'hearts' });
dojo.place(html, 'player_hand');

// The variable name passed to format_block must match exactly: jstpl_card → 'jstpl_card'
```

### view.php — the pair to .tpl
```php
// yourgame.view.php — passes server data into template variables
class yourgamenameview_yourgamename extends game_view {
    function build_page($viewArgs) {
        // Assign custom variables accessible in the .tpl
        $this->page->assign('current_player_id', $this->game->getCurrentPlayerId());
        // BGA assigns player data for BEGIN/END player automatically
    }
}
```

### New equivalent
In the modern architecture, both `view.php` and `.tpl` are replaced by building the DOM directly in `Game.js setup()`:
```js
setup(gamedatas) {
    for (const [player_id, player] of Object.entries(gamedatas.players)) {
        const div = document.createElement('div');
        div.id = `playertable_${player_id}`;
        div.className = 'playertable';
        div.innerHTML = `<div class="playertablename" style="color:#${player.color}">${player.name}</div>`;
        document.getElementById('game_play_area').appendChild(div);
    }
}
```

---

## PHP: Old vs New Patterns

### Method call style
```php
// OLD — self:: for calling framework methods
self::getActivePlayerId()
self::getObjectFromDb("SELECT ...")
self::notifyAllPlayers(...)
self::initGameStateLabels([...])

// NEW — $this-> everywhere
$this->getActivePlayerId()
$this->getObjectFromDb("SELECT ...")
$this->bga->notify->all(...)
$this->initGameStateLabels([...])
```
`self::` still works in many cases (the framework methods are static), but `$this->` is correct for new code. Some games (like Chakra) mix both.

### Class declaration
```php
// OLD — no namespace, class named after game
class chakra extends Table { ... }

// NEW — namespaced, class is always Game
declare(strict_types=1);
namespace Bga\Games\YourGameName;
class Game extends \Table { ... }
```

### Exceptions
```php
// OLDEST
throw new feException("Something went wrong");
throw new feException("Player error", true); // true = show to player

// INTERMEDIATE (still seen in many games, but also deprecated)
throw new BgaUserException("Player-visible message");
throw new BgaSystemException("Internal bug");

// CURRENT
throw new \Bga\GameFramework\UserException("Player-visible message");
throw new \Bga\GameFramework\SystemException("Internal bug");
throw new \Bga\GameFramework\VisibleSystemException("Visible + logged error");
```

### Notifications
```php
// OLD
$this->notifyAllPlayers('type', clienttranslate('text'), $args);
$this->notifyPlayer($player_id, 'type', clienttranslate('text'), $args);

// NEW
$this->bga->notify->all('type', clienttranslate('text'), $args);
$this->bga->notify->player($player_id, 'type', clienttranslate('text'), $args);
```
Both forms work in the current framework. The old form is not broken — just not idiomatic for new code.

### Game state labels
```php
// OLD (and still supported)
self::initGameStateLabels(['round' => 10, 'phase' => 11]);
$val = self::getGameStateValue('round');
self::setGameStateValue('round', $val + 1);

// NEW (same methods, $this-> style)
$this->initGameStateLabels(['round' => 10, 'phase' => 11]);
```
The IDs (10–99) are reserved for game use; 100+ are for options.

---

## JavaScript: Old vs New Patterns

### Framework style
```js
// OLD — Dojo-based
define(['dojo', 'dojo/_base/declare', 'ebg/core/gamegui'], 
    function(dojo, declare) {
        return declare('bgagame.mygame', ebg.core.gamegui, {
            setup: function(gamedatas) { ... }
        });
    }
);

// NEW — ES6 class (still wrapped in define())
define(['dojo', 'dojo/_base/declare', 'ebg/core/gamegui'],
    function(dojo, declare) {
        return declare('bgagame.mygame', ebg.core.gamegui, {
            setup(gamedatas) { ... }  // shorthand method syntax
        });
    }
);
```
The `define()` wrapper is still required even in new games. The difference is using ES6 shorthand methods and `const`/`let` instead of `var`.

### DOM manipulation
```js
// OLD — Dojo
dojo.place('<div id="x"></div>', 'container');
dojo.place('<div id="x"></div>', 'container', 'first');
dojo.connect(el, 'onclick', this, 'myMethod');
dojo.style('el_id', 'display', 'none');
dojo.addClass('el_id', 'selected');
dojo.removeClass('el_id', 'selected');
dojo.query('.card').forEach(...)
$('el_id')   // BGA's old shorthand for document.getElementById

// NEW — vanilla JS
document.getElementById('container').insertAdjacentHTML('beforeend', '<div id="x"></div>');
el.addEventListener('click', () => this.myMethod());
document.getElementById('el_id').style.display = 'none';
document.getElementById('el_id').classList.add('selected');
document.getElementById('el_id').classList.remove('selected');
document.querySelectorAll('.card').forEach(...)
document.getElementById('el_id')
```
`dojo.place` and `dojo.connect` still work — Dojo is still loaded. Old game code using them is fine; new code should use vanilla JS.

### Sending actions to the server
```js
// OLD — ajaxcall
this.ajaxcall(
    '/yourgame/yourgame/actPlayCard.html',
    { card_id: 42, lock: true },
    this, function(result) {}, function(is_error) {}
);

// NEW — bgaPerformAction (or this.bga.actions.takeAction)
this.bga.actions.takeAction('actPlayCard', { card_id: 42 });
// or:
bgaPerformAction('actPlayCard', { card_id: 42 });
```

### Notification subscription
```js
// OLD — dojo.subscribe
dojo.subscribe('cardPlayed', this, 'notif_cardPlayed');
this.notifqueue.setSynchronousDuration('cardPlayed', 500);

// NEW
this.bga.notifications.subscribe('cardPlayed', this.notif_cardPlayed.bind(this));
this.bga.notifications.setDuration('cardPlayed', 500);
```

### Action buttons
```js
// OLD
this.addActionButton('btn_id', _('Label'), 'myMethod');
this.addActionButton('btn_id', _('Label'), () => this.myMethod(), null, false, 'red');
// color: 'red', 'gray', 'blue' (default)

// NEW
this.bga.statusBar.addActionButton('btn_id', _('Label'), () => this.myMethod());
```

### Template instantiation
```js
// OLD — format_block (still works, used with jstpl_ variables from .tpl)
const html = this.format_block('jstpl_card', { id: 42, type: 'hearts' });
dojo.place(html, 'hand');

// NEW — build DOM directly
const div = document.createElement('div');
div.id = `card_42`;
div.className = 'card card_hearts';
document.getElementById('hand').appendChild(div);
```

---

## Configuration Files: Old vs New

### gameoptions
```php
// OLD — gameoptions.inc.php
$game_options = [
    100 => [
        'name' => totranslate('Variant'),
        'values' => [
            1 => ['name' => totranslate('Standard')],
            2 => ['name' => totranslate('Advanced')],
        ],
    ],
];
```
```jsonc
// NEW — gameoptions.jsonc
{
    "options": {
        "100": {
            "name": "Variant",
            "values": {
                "1": { "name": "Standard" },
                "2": { "name": "Advanced" }
            },
            "default": "1"
        }
    }
}
```

### stats
```php
// OLD — stats.inc.php
$stats_type = [
    'table' => [],
    'player' => [
        'cards_played' => ['id' => 10, 'name' => totranslate('Cards played'), 'type' => 'int'],
    ],
];
```
```jsonc
// NEW — stats.jsonc
{
    "player": {
        "cards_played": { "id": 10, "name": "Cards played", "type": "int" }
    },
    "table": {}
}
```

---

## Reading Old Documentation

When BGA wiki or tutorials use these patterns, translate mentally:

| You see | It means |
|---|---|
| `self::getActivePlayerId()` | `$this->getActivePlayerId()` in new code |
| `feException` or `BgaUserException` | `\Bga\GameFramework\UserException` (current) |
| `BgaSystemException` | `\Bga\GameFramework\SystemException` (current) |
| `notifyAllPlayers(...)` | `$this->bga->notify->all(...)` |
| `$this->getActivePlayerName()` | `$this->getPlayerNameById($this->getActivePlayerId())` |
| `$this->getNew("module.common.deck")` | `$this->deckFactory->createDeck("card")` |
| `action.php` with `ajaxCallWrapper` | Handled by `Game.php` `act*()` methods |
| `view.php` + `.tpl` | Optional; can build UI in `setup()` instead |
| `dojo.connect(el, 'onclick', ...)` | `el.addEventListener('click', ...)` |
| `this.ajaxcall('/game/game/actX.html', ...)` | `this.bga.actions.takeAction('actX', ...)` |
| `this.addActionButton(...)` | `this.bga.statusBar.addActionButton(...)` |
| `gameinfos.inc.php` | `gameinfos.jsonc` |
| `totranslate(...)` in PHP | `clienttranslate(...)` |

---

## What's Actually Deprecated vs Just Old Style

**Broken / avoid entirely:**
- `feException` — use `\BgaUserException` or `\BgaSystemException`
- `gameoptions.inc.php` / `stats.inc.php` / `gameinfos.inc.php` — use JSONC

**Old style but still functional (don't rewrite working code):**
- `self::` method calls — works, just not idiomatic
- `dojo.place`, `dojo.connect`, `dojo.query` — still loaded, still works
- `notifyAllPlayers` / `notifyPlayer` — still works
- `ajaxcall` — still works but discouraged
- `.tpl` files — still supported and sometimes clearer for complex static layouts
- `format_block` — still works alongside Dojo

**Judgment call — only modernize if you're already touching the code:**
- Replacing `self::` with `$this->`
- Converting Dojo DOM calls to vanilla JS
- Converting notifications to new API
