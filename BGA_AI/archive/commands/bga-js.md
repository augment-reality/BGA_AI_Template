# BGA JavaScript Development

You are working on `modules/js/Game.js` for a Board Game Arena game. This is an ES6 class that handles all client-side interface logic.

## Class Structure

```js
define([
    "dojo", "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter",
    "ebg/stock", // include any components used
], function (dojo, declare) {
    return declare("bgagame.yourgamename", ebg.core.gamegui, {

        constructor() {
            console.log('yourgamename constructor');
        },

        setup(gamedatas) {
            // Called once at game start with data from PHP getAllDatas()
            // Build the initial UI here
            console.log("Starting game setup", gamedatas);
            this.setupNotifications();
        },

        ///////////////////////////////////////////////////
        // Game & client states

        onEnteringState(stateName, args) {
            // Called when entering a state — update UI for new state
            switch (stateName) {
                case 'playerTurn':
                    this.addActionButtons(args.args);
                    break;
            }
        },

        onLeavingState(stateName) {
            // Called when leaving a state — clean up UI
        },

        onUpdateActionButtons(stateName, args) {
            // Add/update action buttons for active player states
            if (this.bga.players.isCurrentPlayerActive()) {
                switch (stateName) {
                    case 'playerTurn':
                        this.bga.statusBar.addActionButton('actPass_btn', _('Pass'), () => this.actPass());
                        break;
                }
            }
        },

        ///////////////////////////////////////////////////
        // Player actions

        actPass() {
            this.bga.actions.performAction('actPass');
        },

        actPlayCard(card_id) {
            this.bga.actions.performAction('actPlayCard', { card_id });
        },

        ///////////////////////////////////////////////////
        // Notifications

        setupNotifications() {
            this.bga.notifications.subscribe('cardPlayed', this.notif_cardPlayed.bind(this));
            // For notifications that need sequential animation, set duration:
            this.bga.notifications.setDuration('cardPlayed', 500);
        },

        notif_cardPlayed(notif) {
            const { card, player_id } = notif.args;
            // Animate: move card from hand to play area
        },
    });
});
```

## this.bga API (New Architecture)

### Status Bar & Buttons
```js
this.bga.statusBar.setTitle(_('Your turn'));
this.bga.statusBar.addActionButton('btn_id', _('Label'), handler);
this.bga.statusBar.removeActionButtons();
```

### Actions
```js
// Send action to server
this.bga.actions.performAction('actPlayCard', { card_id: 42 });
this.bga.actions.checkAction('actPlayCard');      // client-side check before sending
this.bga.actions.checkPossibleActions('actPass'); // check if action is in possibleactions

// Old patterns to replace:
// this.ajaxcall('/gamename/gamename/actPlayCard.html', { card_id: 42, lock: true }, ...)
// bgaPerformAction('actPlayCard', { card_id: 42 })
```

### Players
```js
this.bga.players.isCurrentPlayerActive()         // boolean — use this, not this.isCurrentPlayerActive()
this.bga.players.isPlayerActive(player_id)
this.bga.players.getActivePlayerId()             // was: this.getActivePlayerId()
this.bga.players.getActivePlayerIds()            // array — was: this.getActivePlayers()
this.bga.players.getCurrentPlayerId()
this.bga.players.isCurrentPlayerSpectator()      // was: this.isSpectator
this.bga.players.getFormattedPlayerName(player_id)
```

### Player Panels
```js
this.bga.playerPanels.getElement(player_id)      // panel DOM element — was: this.getPlayerPanelElement()
this.bga.playerPanels.getScoreCounter(player_id) // framework score counter — was: this.scoreCtrl[player_id]
```

### Game Area
```js
this.bga.gameArea.getElement()                   // main game div — was: this.getGameAreaElement()
this.bga.gameArea.addLastTurnBanner(msg, args)
this.bga.gameArea.addWinConditionBanner(msg, args)
```

### States
```js
this.bga.states.isOnClientState()               // was: this.on_client_state
this.bga.states.setClientState(name, args)       // was: this.setClientState(...)
this.bga.states.restoreServerGameState()         // was: this.restoreServerGameState()
```

### Dialogs (Promise-based)
```js
// Confirmation — returns Promise, resolves if confirmed
await this.bga.dialogs.confirmation(_('Are you sure?'));

// Multiple choice — returns Promise with chosen index
const choice = await this.bga.dialogs.multipleChoice(_('Choose'), [_('A'), _('B')]);

// Show message
this.bga.dialogs.showMessage(_('Something happened'), 'info'); // type: 'info' or 'error'
this.bga.dialogs.showMoveUnauthorized();

// Old callback-style (deprecated):
// this.confirmationDialog(text, okCallback, cancelCallback)
// this.multipleChoiceDialog(text, choices, callback)
```

### User Preferences
```js
this.bga.userPreferences.get(pref_id)           // was: this.getGameUserPreference(pref_id)
this.bga.userPreferences.set(pref_id, value)    // was: this.setGameUserPreference(pref_id, value)
```

### Images
```js
this.bga.images.dontPreloadImage('card_back.jpg')
this.bga.images.preloadImages(['card_front.jpg', 'board.jpg'])
this.bga.gameui.bgaAnimationsActive()           // was: !this.instantaneousMode (logic reversed)
```

### Notifications
```js
this.bga.notifications.subscribe('notifType', handler);
this.bga.notifications.setDuration('notifType', 500); // ms before next notif fires
```

## DOM Manipulation (Vanilla JS — no Dojo)
```js
// Create element
const el = document.createElement('div');
el.id = 'card_42';
el.classList.add('card', 'card_hearts');
document.getElementById('player_hand').appendChild(el);

// Animate (slide to location)
this.slideToObject('card_42', 'discard_pile').play();

// Old Dojo patterns to replace:
// dojo.place(html, container)     → element.innerHTML / appendChild
// dojo.connect(el, 'onclick', fn) → el.addEventListener('click', fn)
// dojo.style(el, {...})           → el.style.property = value
// dojo.query('.class')            → document.querySelectorAll('.class')
```

## setup() Pattern
```js
setup(gamedatas) {
    // 1. Build static board structure
    // 2. Place pieces/cards from gamedatas
    for (const player_id in gamedatas.players) {
        const player = gamedatas.players[player_id];
        // set up player panels, counters, etc.
    }

    // 3. Set up hand (often using Stock component — see /bga-stock)
    // 4. Subscribe to notifications
    this.setupNotifications();
}
```

## onEnteringState / Action Buttons
```js
onUpdateActionButtons(stateName, args) {
    if (this.bga.players.isCurrentPlayerActive()) {
        if (stateName === 'playerTurn') {
            // Add buttons for each legal action
            this.bga.statusBar.addActionButton(
                'btn_play', _('Play Card'),
                () => this.onPlayCard()
            );
        }
    }
}
```

## Counters
```js
// ebg/counter tracks a displayed integer
this.scoreCounter = {};
for (const player_id in gamedatas.players) {
    this.scoreCounter[player_id] = new ebg.counter();
    this.scoreCounter[player_id].create(`score_p${player_id}`);
    this.scoreCounter[player_id].setValue(gamedatas.players[player_id].score);
}
// Update:
this.scoreCounter[player_id].incValue(1);
this.scoreCounter[player_id].setValue(newVal);
```
