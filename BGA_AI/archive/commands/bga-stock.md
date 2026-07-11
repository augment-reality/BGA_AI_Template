# BGA Stock JS Component

You are working with the BGA `Stock` JavaScript component for displaying and managing sets of same-sized game elements (cards, tiles, tokens) in an automatically laid-out container.

## Setup

### Include in define() block
```js
define([
    "dojo", "dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/stock",  // ← include this
], function (dojo, declare) { ... });
```

### Create and configure
```js
setup(gamedatas) {
    // Create the stock
    this.playerHand = new ebg.stock();
    this.playerHand.create(
        this,                                    // page (always 'this')
        document.getElementById('player_hand'), // container DOM element
        73,                                     // item width (px)
        98                                      // item height (px)
    );

    // Define item types BEFORE adding items
    // addItemType(type_id, weight, image_url, image_position)
    // image_position = index into sprite sheet (0 = first, 1 = second, etc.)
    for (let type_id = 0; type_id < 52; type_id++) {
        this.playerHand.addItemType(type_id, type_id, g_gamethemeurl + 'img/cards.jpg', type_id);
    }

    // Add existing cards from game data
    for (const card of Object.values(gamedatas.hand)) {
        const type_id = this.getCardTypeId(card);
        this.playerHand.addToStockWithId(type_id, card.id);
    }

    // Enable selection
    this.playerHand.setSelectionMode(1); // 0=none, 1=single, 2=multi
    this.playerHand.onChangeSelection = (control_name, item_id) => {
        this.onHandCardSelected(item_id);
    };
}
```

## addItemType Parameters
```js
stock.addItemType(
    type_id,        // integer: your item category identifier
    weight,         // integer: sort order (lower = leftmost/first)
    image_url,      // string: sprite sheet URL (use g_gamethemeurl + 'img/...')
    image_position  // integer: 0-based index in sprite sheet, left-to-right, top-to-bottom
);

// image_position for a 4-column sprite sheet:
// row 0: positions 0, 1, 2, 3
// row 1: positions 4, 5, 6, 7
// ...
// Must set image_items_per_row if sheet has multiple rows:
stock.image_items_per_row = 4; // columns in sprite sheet
```

## Adding / Removing Items

### Without tracking by ID (use when items are interchangeable)
```js
stock.addToStock(type_id);
stock.addToStock(type_id, 'source_element_id'); // animate slide from element
stock.removeFromStock(type_id);
stock.removeFromStock(type_id, 'target_element_id'); // animate slide to element
```

### With ID tracking (use when you need to reference specific items)
```js
stock.addToStockWithId(type_id, item_id);
stock.addToStockWithId(type_id, item_id, 'source_element_id'); // with animation
stock.removeFromStockById(item_id);
stock.removeFromStockById(item_id, 'target_element_id');       // with animation
```

### Clear all
```js
stock.removeAll();
stock.removeAllTo('target_element_id'); // animate all to same target
```

## Moving Items Between Stocks (Mutation Pattern)
Add to destination first using the source item's HTML ID, then remove from source without animation. This creates a smooth slide effect.
```js
moveCardBetweenStocks(card_id, from_stock, to_stock) {
    const source_div_id = from_stock.getItemDivId(card_id);
    to_stock.addToStockWithId(type_id, card_id, source_div_id); // slides FROM source
    from_stock.removeFromStockById(card_id);                     // remove without anim
}
```

## Selection
```js
stock.setSelectionMode(0);  // disabled
stock.setSelectionMode(1);  // single select
stock.setSelectionMode(2);  // multi-select

// Selection appearance
stock.setSelectionAppearance('border');    // highlight border (default)
stock.setSelectionAppearance('disappear'); // selected item disappears
stock.setSelectionAppearance('class');     // adds 'selected' CSS class only

// Manual control
stock.selectItem(item_id);
stock.unselectItem(item_id);
stock.unselectAll();
stock.selectItemsByType(type_id);
stock.unselectItemsByType(type_id);

// Read selection
const selected = stock.getSelectedItems(); // [{type: X, id: Y}, ...]
const is_selected = stock.isSelected(item_id); // boolean
```

## Callbacks
```js
// Selection changed
stock.onChangeSelection = (control_name, item_id) => {
    const selected = stock.getSelectedItems();
    // enable/disable action buttons based on selection
};

// Item created (use to add click handlers or tooltips)
stock.onItemCreate = (div, type_id, item_id) => {
    div.addEventListener('click', () => this.onItemClick(item_id));
    this.addTooltip(div.id, _('Card description'), '');
};

// Item removed
stock.onItemDelete = (div, type_id, item_id) => { ... };
```

## Querying State
```js
stock.count()                 // total item count
stock.getAllItems()            // [{type: X, id: Y}, ...]
stock.getPresentTypeList()    // {type_id: count, ...}
stock.getItemById(item_id)    // {type: X, id: Y} or undefined
stock.getItemDivId(item_id)   // DOM element ID string: "stockId_item_itemId"
```

## Layout Properties
```js
stock.item_margin = 5;              // px gap between items (default: 5)
stock.centerItems = true;           // center items in container
stock.autowidth = true;             // fix inline-block width calc issues
stock.extraClasses = 'card mycard'; // added to every item div

// Overlap for fan/hand layouts
stock.setOverlap(30, 0);            // 30% horizontal overlap, 0% vertical
// Or use properties directly:
stock.horizontal_overlap = 30;
stock.vertical_overlap = 0;
```

## Safari Sprite Fix
Sprites misalign on Safari at non-native sizes. Fix with background-size percentage:
```css
/* If sprite sheet has 13 columns × 4 rows: */
.stockitem {
    background-size: 1300% 400%; /* cols*100% × rows*100% */
}
```
Then set positions as percentages. Calculate in `onItemCreate`:
```js
stock.onItemCreate = (div, type_id) => {
    const cols = 13, rows = 4;
    const col = type_id % cols;
    const row = Math.floor(type_id / cols);
    div.style.backgroundPosition =
        `${(col / (cols - 1)) * 100}% ${(row / (rows - 1)) * 100}%`;
};
```

## Handling Notifications
```js
notif_cardDrawn(notif) {
    const { card, from_location } = notif.args;
    const type_id = this.getCardTypeId(card);

    // Animate from deck element to hand
    this.playerHand.addToStockWithId(type_id, card.id, 'deck_pile');
}

notif_cardPlayed(notif) {
    const { card } = notif.args;
    // Animate from hand to play area
    this.playerHand.removeFromStockById(card.id, 'play_area');
}
```

## updateDisplay()
Call after making multiple changes at once to batch the layout refresh:
```js
stock.updateDisplay(); // re-layout without animation
stock.updateDisplay('source_element_id'); // re-layout with slide-in animation
```

## Common Mistakes
- Always call `addItemType()` for every type BEFORE adding items of that type
- Don't forget `image_items_per_row` for multi-row sprites
- When moving between stocks, add to destination before removing from source
- IDs from PHP (`card['id']`) are strings — may need `parseInt()` when comparing
