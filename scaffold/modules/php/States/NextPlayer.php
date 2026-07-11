<?php
declare(strict_types=1);

namespace Bga\Games\YourGame\States;

use Bga\GameFramework\StateType;
use Bga\Games\YourGame\Game;

use const Bga\Games\YourGame\GV_TURNS_PLAYED;
use const Bga\Games\YourGame\ST_NEXT_PLAYER;

class NextPlayer extends \Bga\GameFramework\States\GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: ST_NEXT_PLAYER,
            type: StateType::GAME,
            name: 'nextPlayer',
            updateGameProgression: true,
        );
    }

    public function onEnteringState(int $activePlayerId)
    {
        $this->game->incGameStateValue(GV_TURNS_PLAYED, 1);
        $this->game->incStat(1, 'turns_played');

        // TODO: check end-of-game condition here and return EndScore::class when met.

        $this->game->giveExtraTime($activePlayerId);
        $this->game->activeNextPlayer();
        return PlayerTurn::class;
    }
}
