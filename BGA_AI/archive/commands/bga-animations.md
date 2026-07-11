# BGA Animations

You are working on client-side animations in a Board Game Arena game. BGA provides a built-in animation API that handles moving, attaching, fading, and positioning elements.

## Core Concept: Animation Objects

Most BGA animation methods return an animation object. Call `.play()` to execute it, or chain it with `.onEnd()` to run a callback when done.

```js
// Basic pattern: create animation, then play it
const anim = this.slideToObject('card_42', 'discard_pile');
anim.play();

// With callback
this.slideToObject('card_42', 'discard_pile').onEnd(() => {
    // element has arrived
    document.getElementById('card_42').classList.add('face-up');
}).play();
```

## Core Animation Methods

### slideToObject — slide element to overlap another element
```js
// slideToObject(element_id, destination_id, duration_ms?, delay_ms?)
this.slideToObject('card_42', 'discard_pile').play();
this.slideToObject('card_42', 'discard_pile', 600, 0).play(); // 600ms, no delay
```
The element visually slides to sit on top of the destination. The element stays in its original DOM position — use `attachToNewParent` before or after if you need to reparent it.

### slideToObjectPos — slide to element with pixel offset
```js
// slideToObjectPos(element_id, destination_id, x_offset, y_offset, duration_ms?, delay_ms?)
this.slideToObjectPos('energy_7', 'ph_player_3_2', 0, 0).play();            // center on target
this.slideToObjectPos('token_1', 'board', 120, 85, 800).play();             // offset within target
```
Use this to place a piece at an exact position within a container, not just on top of it.

### attachToNewParent — reparent element without visual jump
```js
// attachToNewParent(element_id, new_parent_id, relation?)
// relation defaults to 'last' (append). Also: 'first', 'before', 'after'
this.attachToNewParent('card_42', 'player_hand_5678');
```
This transfers the element to a new parent div while keeping it visually in the same screen position. Essential before sliding: attach first (so the element belongs to the right container), then slide.

### placeOnObject — instant teleport (no animation)
```js
// placeOnObject(element_id, destination_id)
this.placeOnObject('card_42', 'draw_pile');
```
Instantly positions `element_id` on top of `destination_id`. Use to set starting position before animating:
```js
this.placeOnObject('card_42', 'draw_pile');        // snap to deck first
this.slideToObject('card_42', 'player_hand').play(); // then animate to hand
```

### fadeOutAndDestroy — fade out and remove from DOM
```js
// fadeOutAndDestroy(element_id, duration_ms?, delay_ms?)
this.fadeOutAndDestroy('energy_42');
this.fadeOutAndDestroy('token_7', 500, 200);   // 500ms fade, 200ms delay
```

## Common Animation Patterns

### Deal a card from deck to player hand
```js
notif_cardDealt(notif) {
    const { card, player_id } = notif.args;

    // 1. Create the card element at the deck position
    const card_html = this.format_block('jstpl_card', { id: card.id, type: card.type });
    document.getElementById('draw_pile').insertAdjacentHTML('beforeend', card_html);

    // 2. Slide it to the player's hand
    this.slideToObject(`card_${card.id}`, `player_hand_${player_id}`).onEnd(() => {
        // 3. Reparent into the hand for layout purposes
        this.attachToNewParent(`card_${card.id}`, `player_hand_${player_id}`);
        // If using Stock: add to stock instead
        this.playerHands[player_id].addToStockWithId(card.type, card.id);
        document.getElementById(`card_${card.id}`)?.remove(); // stock manages the div
    }).play();
}
```

### Move piece to a board slot
```js
notif_pieceMoved(notif) {
    const { piece_id, target_slot } = notif.args;
    // Attach to new parent first, then slide into position
    this.attachToNewParent(`piece_${piece_id}`, target_slot);
    this.slideToObjectPos(`piece_${piece_id}`, target_slot, 0, 0, 600).play();
}
```

### Animate from one location to another with reparenting
```js
movePiece(piece_id, from_zone, to_zone) {
    // The element is in from_zone; move it to to_zone visually
    this.attachToNewParent(`piece_${piece_id}`, to_zone);
    this.slideToObjectPos(`piece_${piece_id}`, to_zone, 0, 0).play();
}
```

### Create element, animate it in, then attach
```js
// Element appears at source, animates to destination, then stays there
spawnToken(token_id, source_id, destination_id) {
    const html = `<div class="token" id="token_${token_id}"></div>`;
    document.getElementById('game_play_area').insertAdjacentHTML('beforeend', html);
    this.placeOnObject(`token_${token_id}`, source_id);
    this.slideToObject(`token_${token_id}`, destination_id).onEnd(() => {
        this.attachToNewParent(`token_${token_id}`, destination_id);
        this.slideToObjectPos(`token_${token_id}`, destination_id, 0, 0, 0).play();
    }).play();
}
```

### Destroy with animation
```js
notif_tokenRemoved(notif) {
    this.fadeOutAndDestroy(`token_${notif.args.token_id}`, 400);
}
```

## Notification Duration & Sequencing

BGA plays notifications one at a time. To give animations time to complete before the next notification fires, set a duration:

```js
setupNotifications() {
    this.bga.notifications.subscribe('cardDealt', this.notif_cardDealt.bind(this));
    this.bga.notifications.subscribe('pieceRemoved', this.notif_pieceRemoved.bind(this));

    // Tell BGA to wait this many ms after notification before firing the next one
    this.bga.notifications.setDuration('cardDealt', 700);
    this.bga.notifications.setDuration('pieceRemoved', 500);

    // Old pattern (still works):
    // this.notifqueue.setSynchronousDuration('cardDealt', 700);
}
```

## Animation Timing Tips

- Default slide duration is ~500ms. Match your `setDuration` value to your animation length.
- For multi-step animations (slide → reparent → fade), set duration to the full chain length.
- `placeOnObject` + `slideToObject` is the standard "appear and fly" combo.
- `attachToNewParent` + `slideToObjectPos(..., 0, 0)` is the standard "snap into slot" combo.
- Never animate an element that doesn't exist in the DOM — create it first.

## Tooltip API

```js
// Add simple text tooltip
this.addTooltip('element_id', _('Tooltip text'), _('Action hint'));

// Add rich HTML tooltip
this.addTooltipHtml('element_id', '<div class="tooltip">...</div>');

// Add tooltip to all elements matching a CSS class
this.addTooltipToClass('card_class', _('Card description'), '');
```
