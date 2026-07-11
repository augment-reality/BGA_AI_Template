<?php
declare(strict_types=1);

namespace Bga\Games\YourGame\States;

use Bga\GameFramework\StateType;
use Bga\Games\YourGame\Game;

use const Bga\Games\YourGame\ST_END_SCORE;
use const Bga\Games\YourGame\ST_END_GAME;

class EndScore extends \Bga\GameFramework\States\GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: ST_END_SCORE,
            type: StateType::GAME,
            name: 'endScore',
        );
    }

    public function onEnteringState()
    {
        // TODO: final scoring — write player_score (and player_score_aux for tiebreaks):
        // $this->game->DbQuery("UPDATE player SET player_score = ... WHERE player_id = ...");

        return ST_END_GAME;
    }
}
