<?php
declare(strict_types=1);

namespace Bga\Games\YourGame;

// ─── State IDs (unique; 1 = setup, 98/99 reserved for end-score/end-game) ────
const ST_PLAYER_TURN = 10;
const ST_NEXT_PLAYER = 90;
const ST_END_SCORE   = 98;
const ST_END_GAME    = 99;

// ─── Global variable names (framework game-state labels, ids 10–99) ──────────
const GV_TURNS_PLAYED = 'gv_turns_played';

// ─── Static game data ─────────────────────────────────────────────────────────
// Card types keyed by type id. 'copies' consumed by setupNewGame.
const CARD_TYPES = [
    1 => ['name' => 'Example card', 'copies' => 4],
    2 => ['name' => 'Another card', 'copies' => 4],
];
