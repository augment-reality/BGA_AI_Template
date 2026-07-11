<?php
declare(strict_types=1);

namespace Bga\Games\YourGame;

use Bga\GameFramework\Components\Deck;
use Bga\Games\YourGame\States\PlayerTurn;

require_once 'material.inc.php';

class Game extends \Bga\GameFramework\Table
{
    public Deck $cards; // delete if the game has no cards

    public function __construct()
    {
        parent::__construct();

        $this->initGameStateLabels([
            GV_TURNS_PLAYED => 10,
        ]);

        // Deck component — table name must match dbmodel.sql. Delete if no cards.
        $this->cards = $this->deckFactory->createDeck('card');
        // $this->cards->autoreshuffle = true;
        // $this->cards->autoreshuffle_custom = ['discard' => 'deck'];

        // Framework player counter — simple per-player number with no custom DB
        // column. Init in setupNewGame (initDb), send via getAllDatas (fillResult),
        // change with ->inc()/->set(). JS side: new ebg.counter() created with
        // { playerCounter: 'energy', playerId } picks it up automatically.
        // $this->playerEnergy = $this->bga->counterFactory->createPlayerCounter('energy');

        // Notification decorator — auto-fills player_name from player_id on every
        // notification whose message uses ${player_name}:
        // $this->bga->notify->addDecorator(function (string $message, array $args) {
        //     if (isset($args['player_id']) && !isset($args['player_name']) && str_contains($message, '${player_name}')) {
        //         $args['player_name'] = $this->getPlayerNameById($args['player_id']);
        //     }
        //     return $args;
        // });
    }

    // ─── Core framework methods ───────────────────────────────────────────────

    public function getGameProgression(): int
    {
        // Return 0–99. Replace with a real estimate for this game.
        return 50;
    }

    public function upgradeTableDb($from_version): void {}

    protected function getAllDatas(int $currentPlayerId): array
    {
        $result = [];

        $result['players'] = $this->getCollectionFromDb(
            'SELECT player_id AS id, player_no AS no, player_color AS color,
                    player_name AS name, player_score AS score
             FROM player'
        );

        // Own hand (private — only this player's cards)
        $result['hand'] = array_values($this->cards->getPlayerHand($currentPlayerId));

        // Hand sizes of all players (public)
        $result['hand_counts'] = $this->cards->countCardsByLocationArgs('hand');

        return $result;
    }

    protected function setupNewGame($players, $options = [])
    {
        $this->setGameStateInitialValue(GV_TURNS_PLAYED, 0);

        // Init every stat declared in stats.jsonc. (Newer object-style API does the
        // same: $this->tableStats->init('turns_played', 0);
        //       $this->playerStats->init('cards_played', 0); )
        $this->initStat('table', 'turns_played', 0);
        foreach (array_keys($players) as $playerId) {
            $this->initStat('player', 'cards_played', 0, $playerId);
        }
        // If using a PlayerCounter (see __construct):
        // $this->playerEnergy->initDb(array_keys($players), initialValue: 2);
        // ...and in getAllDatas: $this->playerEnergy->fillResult($result);

        // Set player colors and create player rows
        $gameinfos     = $this->getGameinfos();
        $defaultColors = $gameinfos['player_colors'];

        $queryValues = [];
        foreach ($players as $playerId => $player) {
            $queryValues[] = vsprintf("(%s, '%s', '%s')", [
                $playerId,
                array_shift($defaultColors),
                addslashes($player['player_name']),
            ]);
        }
        static::DbQuery(sprintf(
            'INSERT INTO `player` (player_id, player_color, player_name) VALUES %s',
            implode(',', $queryValues)
        ));

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        $this->reloadPlayersBasicInfos();

        // Create and shuffle cards, deal starting hands (delete if no cards)
        $cards = [];
        foreach (CARD_TYPES as $typeId => $typeData) {
            $cards[] = ['type' => (string)$typeId, 'type_arg' => 0, 'nbr' => $typeData['copies']];
        }
        $this->cards->createCards($cards, 'deck');
        $this->cards->shuffle('deck');
        foreach (array_keys($players) as $playerId) {
            $this->cards->pickCards(3, 'deck', $playerId);
        }

        $this->activeNextPlayer();
        return PlayerTurn::class;
    }

    // ─── Shared helpers ───────────────────────────────────────────────────────

    /** Notify everyone EXCEPT one player (e.g. hidden card draws). */
    public function notifyAllExceptPlayer(int $excludedPlayerId, string $notifName, ?string $message = '', array $args = []): void
    {
        foreach ($this->getCollectionFromDb('SELECT player_id FROM player') as $player) {
            $playerId = (int)$player['player_id'];
            if ($playerId !== $excludedPlayerId) {
                $this->bga->notify->player($playerId, $notifName, $message, $args);
            }
        }
    }

    // ─── Debug helpers ────────────────────────────────────────────────────────

    public function debug_goToState(int $state = ST_PLAYER_TURN): void
    {
        $this->gamestate->jumpToState($state);
    }
}
