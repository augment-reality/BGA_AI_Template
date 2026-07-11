# BGA CSS Development

You are working on CSS for a Board Game Arena game. BGA games use standard CSS with some BGA-specific conventions.

## File Location
Typically `yourgamename.css` at the project root. Linked automatically by the framework.

## BGA Layout Conventions

### Game Board
```css
/* Absolute positioning within a relative container is standard */
#game_play_area {
    position: relative;
    width: 800px;
    height: 600px;
}

/* Pieces/tokens use absolute positioning */
.piece {
    position: absolute;
    width: 40px;
    height: 40px;
}
```

### Player Panels
BGA renders player panels automatically. You can extend them:
```css
/* Target a player's extra panel section */
#player_board_config_PLAYER_ID {
    /* custom content injected into player panel */
}
```

## Sprite Sheets
BGA games almost always use sprite sheets for cards and tokens.

```css
.card {
    width: 73px;
    height: 98px;
    background-image: url('img/cards.jpg');
    background-repeat: no-repeat;
}

/* Each card type positions the sprite */
.card_type_1  { background-position: 0px 0px; }
.card_type_2  { background-position: -73px 0px; }
.card_type_3  { background-position: -146px 0px; }
/* row 2 */
.card_type_11 { background-position: 0px -98px; }
```

### Safari Sprite Fix
Safari misaligns sprites at small sizes. Use `background-size` as a percentage:
```css
.card {
    /* If sprite sheet is 4 columns × 3 rows: */
    background-size: 400% 300%; /* 100% * cols, 100% * rows */
    /* Then positions become percentages: */
}

/* Calculate percentage positions:
   x% = (col / (cols - 1)) * 100
   y% = (row / (rows - 1)) * 100
*/
.card_type_1 { background-position: 0% 0%; }
.card_type_2 { background-position: 33.33% 0%; }   /* col 1 of 4 */
.card_type_3 { background-position: 66.66% 0%; }   /* col 2 of 4 */
```

## Stock Component Styling
When using the Stock JS component, items get auto-generated class names:
```css
/* All items in a stock */
.stockitem {
    cursor: pointer;
}

/* Selected item highlight (when using 'border' selection appearance) */
.stockitem_selected {
    outline: 3px solid gold;
}

/* Custom class added via stock.extraClasses */
.card_in_hand {
    /* styling for cards in player hand */
}
```

## Animations
BGA's JS framework provides `slideToObject()` — no CSS transitions needed for movement. Use CSS transitions for visual state changes only:
```css
.card {
    transition: transform 0.15s ease;
}
.card:hover {
    transform: translateY(-8px);
}
.card.selected {
    transform: translateY(-12px);
}
```

## Z-index Conventions
```css
.board-layer     { z-index: 1; }
.piece-layer     { z-index: 2; }
.card-layer      { z-index: 3; }
.animation-layer { z-index: 10; }
.tooltip-layer   { z-index: 100; }
```

## Responsive / Scaling
BGA handles zoom-level adjustments. Design for a fixed logical resolution and let BGA scale:
```css
#game_play_area {
    /* Fixed logical dimensions — BGA scales to fit viewport */
    width: 960px;
    min-height: 600px;
}
```

## Color Conventions
Player colors are applied by BGA automatically to player panels. In CSS you can reference them:
```css
/* BGA assigns player_color as inline style; use currentColor or inherit */
.player_score {
    color: inherit; /* inherits from .player_board which has the player color */
}
```

## Image Paths
All images go in the `img/` directory. Reference in CSS with relative paths:
```css
background-image: url('img/cards.jpg');
background-image: url('img/board.jpg');
```

> **Before debugging sprite/card CSS:** always verify the image files actually exist in `img/` first (`Glob **/*.{jpg,png,gif,webp,svg}`). A missing image causes elements to render as blank outlines with correct size/border — identical to a wrong `background-position`. Common required files: `cards.jpg`, `board.jpg`, `tokens.png`, `FakeDeck.png` (card back). If a file is missing, no amount of CSS fixes will help.

## High-Definition / Retina Graphics (@2x)

Provide a double-resolution image and swap it in via media query:
```css
.card {
    background-image: url('img/cards.jpg'); /* 1x */
}
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .card {
        background-image: url('img/cards@2x.jpg'); /* 2x */
        background-size: 730px 980px; /* 1x dimensions — keeps layout the same */
    }
}
```
Name convention: `cards.jpg` (1x) and `cards@2x.jpg` (2x). Both go in `img/`.

## CSS Classes from Game State

**New BGA framework:** the framework does NOT reliably inject server-state names as body classes. Drive interactive state via JS-managed classes instead. In `onEnteringState` add a class to the relevant container; remove it in `onLeavingState`. Key off that class in CSS:

```css
/* JS adds .active to #fuji-hand in onEnteringState when it's the player's turn */
#fuji-hand:not(.active) .fujicard { pointer-events: none; }
#fuji-hand.active .fujicard { cursor: pointer; }
```

**Old BGA framework only:** body state classes were injected automatically. Avoid relying on this pattern in new-framework games — it won't work:
```css
/* OLD PATTERN — do not use in new framework */
body:not(.playerTurn) .card { pointer-events: none; }
```

## Scale to Fit (Large Boards)

For boards that exceed the viewport, apply a CSS transform scale and persist the zoom level:

```css
#full-table {
    transform-origin: top left;
    /* scale is set dynamically via JS */
}
```

```js
// In setup() or a zoom control handler
setZoom(level) {
    const table = document.getElementById('full-table');
    table.style.transform = `scale(${level})`;
    table.style.width = `${100 / level}%`; // compensate for layout
    localStorage.setItem('mygame_zoom', level);
},

// Restore on load
setup(gamedatas) {
    const saved = parseFloat(localStorage.getItem('mygame_zoom') ?? '1');
    this.setZoom(saved);
    // ...
}
```
BGA also provides a built-in `BgaZoom.Manager` (used in some framework-prototype games) as an alternative.
