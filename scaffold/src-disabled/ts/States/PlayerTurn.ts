import { Game } from "../Game";

/**
 * One State class per declared PHP state. onEnteringState, onLeavingState and
 * onPlayerActivationChange are predefined names called by the framework.
 */
export class PlayerTurn {
    constructor(private game: Game, private bga: Bga<YourGamePlayer, YourGameGamedatas>) {
    }

    onEnteringState(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
        // Status bar title comes from the state's description/descriptionMyTurn
        // (PlayerTurn.php) — the framework substitutes ${actplayer}/${you} itself.
        // Don't override it here with setTitle(); a manual call doesn't get that
        // substitution and leaves ${actplayer} blank for non-active players.
        if (isCurrentPlayerActive) {
            args.playableCardsIds.forEach(cardId => {
                const el = document.getElementById(`card-${cardId}`);
                if (el) {
                    el.classList.add('yourgame-playable');
                    el.onclick = () => this.onCardClick(cardId);
                }
            });

            this.bga.statusBar.addActionButton(_('Pass'),
                () => this.bga.actions.performAction("actPass"), { color: 'secondary' });
        }
    }

    onLeavingState(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
        document.querySelectorAll('.yourgame-playable').forEach(el => {
            el.classList.remove('yourgame-playable');
            (el as HTMLElement).onclick = null;
        });
    }

    /**
     * Called when the current player becomes active/inactive in a
     * MULTIPLE_ACTIVE_PLAYER state. Delete if this state is single-active.
     */
    onPlayerActivationChange(args: PlayerTurnArgs, isCurrentPlayerActive: boolean) {
    }

    onCardClick(card_id: number) {
        this.bga.actions.performAction("actPlayCard", { card_id });
    }
}
