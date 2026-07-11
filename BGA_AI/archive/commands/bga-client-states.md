# BGA Client States — Multi-Step Interactions

You are working on client-side interactions that require multiple steps or selections before sending an action to the server. Client states let you manage this entirely in JavaScript — no server round-trip until the player has completed all their choices.

## What Client States Are

A client state is a temporary, client-only game state that exists between the server-defined states. The server is unaware of it. When a player needs to make a two-step selection (e.g., pick a card, then pick a target), you can use a client state for the second step rather than sending a partial action to the server.

## Two-Step Selection with CSS Classes (Simple Case)

When the interaction is just "select A, then select B", CSS classes are enough — no client state needed:

```js
onUpdateActionButtons(stateName, args) {
    if (this.bga.players.isCurrentPlayerActive() && stateName === 'playerTurn') {
        this.bga.statusBar.addActionButton('btn_cancel', _('Cancel'), () => this.onCancel());
    }
},

onCardClick(card_id) {
    if (this.selectedCard === null) {
        // Step 1: select the card
        this.selectedCard = card_id;
        document.getElementById(`card_${card_id}`).classList.add('selected');
        this.bga.statusBar.setTitle(_('Now select a target'));
    } else {
        // Step 2: send the action
        this.bga.actions.performAction('actPlayCard', {
            card_id: this.selectedCard,
            target_id: card_id,
        });
        this.clearSelection();
    }
},

onCancel() {
    this.clearSelection();
    this.bga.states.restoreServerGameState(); // reset title/buttons
},

clearSelection() {
    if (this.selectedCard !== null) {
        document.getElementById(`card_${this.selectedCard}`)?.classList.remove('selected');
        this.selectedCard = null;
    }
},
```

## Client States (Complex Case)

Use `this.bga.states.setClientState()` when the second step needs its own `onUpdateActionButtons` logic, different action buttons, or its own title — essentially when it's complex enough to deserve its own state.

```js
onCardClick(card_id) {
    // Step 1 complete — enter a client state for step 2
    this.selectedCard = card_id;
    this.bga.states.setClientState('client_selectTarget', {
        descriptionmyturn: _('${you} must select a target'),
        args: { selectedCard: card_id }
    });
},

// This fires when entering the client state (just like a server state)
onEnteringState(stateName, args) {
    if (stateName === 'client_selectTarget') {
        // Highlight valid targets
        this.highlightValidTargets(args.args.selectedCard);
    }
},

// This fires for the client state too
onUpdateActionButtons(stateName, args) {
    if (stateName === 'client_selectTarget') {
        this.bga.statusBar.addActionButton('btn_cancel', _('Cancel'), () => {
            this.bga.states.restoreServerGameState(); // exit client state
        });
    }
},

onTargetClick(target_id) {
    // Step 2 complete — send the full action
    this.bga.actions.performAction('actPlayCard', {
        card_id: this.selectedCard,
        target_id,
    });
},
```

## Key API

```js
// Enter a client state
this.bga.states.setClientState('client_stateName', {
    descriptionmyturn: _('${you} must do something'),
    args: { /* arbitrary data accessible in onEnteringState */ }
});

// Exit client state and restore server state (title, buttons, entering state)
this.bga.states.restoreServerGameState();

// Check if currently in a client state
this.bga.states.isOnClientState(); // returns boolean

// Old patterns (still functional, but use new API for new code):
// this.setClientState(...)
// this.restoreServerGameState()
// this.on_client_state
```

## Client-Side Action Stack

For games where a player must resolve a chain of effects one at a time, use an array as a queue:

```js
setup(gamedatas) {
    this.effectQueue = [];
    // ...
},

// Server sends a notification with a list of effects to resolve
notif_effectsTriggered(notif) {
    this.effectQueue = [...notif.args.effects];
    this.processNextEffect();
},

processNextEffect() {
    if (this.effectQueue.length === 0) {
        this.bga.states.restoreServerGameState();
        return;
    }
    const effect = this.effectQueue[0];
    this.bga.states.setClientState(`client_resolve_${effect.type}`, {
        descriptionmyturn: _('${you} must resolve: ') + _(effect.label),
        args: { effect }
    });
},

onEffectResolved(choice) {
    const effect = this.effectQueue.shift(); // remove from queue
    // Send choice to server or accumulate for batch send
    this.processNextEffect(); // advance to next
},
```

## Naming Convention

Prefix all client state names with `client_` to distinguish them from server states and avoid collision:
```js
'client_selectTarget'
'client_chooseBonus'
'client_resolveAbility'
```

## onLeavingState Cleanup

Client states trigger `onLeavingState` just like server states. Use it to clear highlights:
```js
onLeavingState(stateName) {
    if (stateName === 'client_selectTarget') {
        this.clearTargetHighlights();
    }
},
```

## When to Use Each Approach

| Scenario | Use |
|---|---|
| Simple two-click selection, same buttons | CSS classes + flag variable |
| Second step needs different title/buttons | `setClientState()` |
| Chain of effects to resolve | Client-side queue + `setClientState()` |
| Multiple effects that all need server confirmation | Server-side queue (see `/bga-modules` for server action stack) |
