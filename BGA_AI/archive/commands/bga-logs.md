# BGA Notification Logs — HTML & Image Injection

You are working on BGA notification logs — the chat-like history of game events shown to all players. By default logs display plain text, but you can inject styled HTML, card images, player colors, and icons.

## How Log Formatting Works

When the server sends a notification, it includes a message string with `${variable}` placeholders and an `args` array. On the client, the framework substitutes the args into the message. You can intercept this substitution to replace plain text values with HTML — icons, colored spans, card images, etc.

## bgaFormatText() — The Modern Approach

Define `bgaFormatText(text)` in your `Game.js` to post-process log entries after variable substitution. This is the current recommended approach.

```js
bgaFormatText(text) {
    // Replace [suit:hearts] tokens with icon HTML
    text = text.replace(/\[suit:(\w+)\]/g, (_, suit) =>
        `<span class="log-suit log-suit-${suit}"></span>`
    );
    // Replace [card:N] tokens with a small card image
    text = text.replace(/\[card:(\d+)\]/g, (_, type) =>
        `<span class="log-card log-card-${type}"></span>`
    );
    return text;
}
```

Then in PHP, embed the token in the message string:
```php
$this->bga->notify->all('cardPlayed', clienttranslate('${player_name} played [card:${card_type}]'), [
    'player_name' => $this->getPlayerNameById($player_id),
    'card_type'   => $card['type'],
]);
```

## Player Name with Color

BGA automatically renders `${player_name}` in the player's color when you pass both `player_name` and `player_id` in the args:

```php
$this->bga->notify->all('scored', clienttranslate('${player_name} scored ${points} points'), [
    'player_name' => $this->getPlayerNameById($player_id),
    'player_id'   => $player_id,   // needed for color rendering
    'points'      => 5,
]);
```

## i18n — Marking Translated String Args

If an arg value is itself a translated string (e.g., a card name), mark it in the `i18n` array so BGA translates it for each player:

```php
$this->bga->notify->all('cardRevealed', clienttranslate('${player_name} revealed ${card_name}'), [
    'player_name' => $this->getPlayerNameById($player_id),
    'player_id'   => $player_id,
    'card_name'   => $card['name'],   // this is a translated string
    'i18n'        => ['card_name'],   // mark it for per-player translation
]);
```

## CSS for Log Icons

Log icons are inline-block elements with a sprite background. Keep them small and vertically aligned:

```css
.log-suit {
    display: inline-block;
    width: 16px;
    height: 16px;
    background-image: url('img/suits.png');
    background-size: auto 16px;
    vertical-align: middle;
    margin: 0 2px;
}
.log-suit-hearts   { background-position: 0px 0; }
.log-suit-diamonds { background-position: -16px 0; }
.log-suit-clubs    { background-position: -32px 0; }
.log-suit-spades   { background-position: -48px 0; }
```

## Log Replay Awareness

Log formatting also runs when replaying game history. Make sure `bgaFormatText()` is pure (no side effects, no DOM changes) — it only transforms text.

## Older Approach: format_string_recursive Override

Some existing games override `format_string_recursive` to inject HTML into logs. This still works but is not recommended for new code — use `bgaFormatText()` instead.

```js
// OLD approach — still functional, don't use for new code
format_string_recursive(log, args) {
    if (args && args.card_type !== undefined) {
        args.card_type = `<span class="log-card log-card-${args.card_type}"></span>`;
    }
    return this.inherited(arguments);
}
```

The problem with overriding `format_string_recursive` is it can interfere with framework internals. `bgaFormatText()` is a safer hook.

## Notification Args Best Practices (Migration Guide)

- Don't send the same data under two different names (e.g., `player_name` and `name` both set to the same value). The migration guide notes args are no longer mutated by the framework.
- Keep args as typed data (strings, ints, arrays) — the log formatter converts them to HTML; the server should not send pre-formatted HTML.
- Avoid large objects in args (e.g., don't send the full game state). Send only what the client needs for that notification.

## Full Example

**PHP:**
```php
$this->bga->notify->all(
    'trickWon',
    clienttranslate('${player_name} wins the trick with [suit:${winning_suit}] ${winning_value}'),
    [
        'player_name'   => $this->getPlayerNameById($winner_id),
        'player_id'     => $winner_id,
        'winning_suit'  => $suit,    // e.g., 'hearts'
        'winning_value' => $value,   // e.g., 10
    ]
);
```

**JS:**
```js
bgaFormatText(text) {
    return text.replace(/\[suit:(\w+)\]/g, (_, suit) =>
        `<span class="log-suit log-suit-${suit}" title="${_(suit)}"></span>`
    );
}
```

**Result in log:** "PlayerName wins the trick with ♥ 10" (where ♥ is an icon from the sprite sheet)
