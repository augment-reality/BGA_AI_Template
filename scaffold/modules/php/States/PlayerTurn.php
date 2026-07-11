<?php
declare(strict_types=1);

namespace Bga\Games\YourGame\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\YourGame\Game;

use const Bga\Games\YourGame\ST_PLAYER_TURN;

class PlayerTurn extends GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: ST_PLAYER_TURN,
            type: StateType::ACTIVE_PLAYER,
            name: 'playerTurn',
            description: clienttranslate('${actplayer} must play a card or pass'),
            descriptionMyTurn: clienttranslate('${you} must play a card or pass'),
        );
    }

    /** Data sent to the client when this state is entered. */
    public function getArgs(): array
    {
        $activePlayerId = (int)$this->game->getActivePlayerId();
        $hand = $this->game->cards->getPlayerHand($activePlayerId);

        return [
            'playableCardsIds' => array_map('intval', array_keys($hand)),
        ];
    }

    // The framework injects $activePlayerId and (when declared) array $args —
    // this state's own getArgs() output — so you can validate against exactly
    // what the client was shown.
    #[PossibleAction]
    public function actPlayCard(int $card_id, int $activePlayerId, array $args)
    {
        if (!in_array($card_id, $args['playableCardsIds'], true)) {
            throw new UserException(clienttranslate('Invalid card choice'));
        }
        $card = $this->game->cards->getCard($card_id);
        if (!$card || $card['location'] !== 'hand' || (int)$card['location_arg'] !== $activePlayerId) {
            throw new UserException(clienttranslate('This card is not in your hand'));
        }

        $this->game->cards->moveCard($card_id, 'discard');
        $this->game->incStat(1, 'cards_played', $activePlayerId);

        $this->notify->all('cardPlayed', clienttranslate('${player_name} plays a card'), [
            'player_id'   => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'card_id'     => (int)$card['id'],
            'card_type'   => (int)$card['type'],
        ]);

        return NextPlayer::class;
    }

    #[PossibleAction]
    public function actPass(int $activePlayerId)
    {
        $this->notify->all('playerPassed', clienttranslate('${player_name} passes'), [
            'player_id'   => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
        ]);

        return NextPlayer::class;
    }

    /** Required: expelled/skipped players hang the table without this. */
    public function zombie(int $playerId)
    {
        return $this->actPass($playerId);
        // Smarter zombie — play a random legal move instead of passing:
        // $args = $this->getArgs();
        // $choice = $this->getRandomZombieChoice($args['playableCardsIds']);
        // return $this->actPlayCard($choice, $playerId, $args);
        // Test zombies in Studio with $this->game->bga->debug->playUntil(fn(int $c) => $c == 1);
    }
}
