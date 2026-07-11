import { PlayerTurn } from "./States/PlayerTurn";

export class Game {
    public bga: Bga<YourGamePlayer, YourGameGamedatas>;
    private gamedatas: YourGameGamedatas;

    private playerTurn: PlayerTurn;

    constructor(bga: Bga<YourGamePlayer, YourGameGamedatas>) {
        console.log('yourgame constructor');
        this.bga = bga;

        // Register the State classes (key = state `name:` on the PHP side)
        this.playerTurn = new PlayerTurn(this, bga);
        this.bga.states.register('playerTurn', this.playerTurn);

        // Debug state changes in the console (remove before production):
        // this.bga.states.logger = console.log;
    }

    /**
     * Set up the game UI from gamedatas (PHP getAllDatas). Called at game start
     * and on every page refresh (F5).
     */
    setup(gamedatas: YourGameGamedatas) {
        console.log("Starting game setup");
        this.gamedatas = gamedatas;

        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="yourgame-board"></div>
            <div id="player-tables"></div>
        `);

        Object.entries(gamedatas.players).forEach(([pId, player]) => {
            document.getElementById('player-tables').insertAdjacentHTML('beforeend', `
                <div id="player_area_${player.id}" class="yourgame-player-area">
                    <div class="yourgame-player-name" style="color:#${player.color}">${player.name}</div>
                    <div id="${player.id}_cards" class="yourgame-player-cards"></div>
                </div>
            `);
        });

        this.setupNotifications();
    }

    ///////////////////////////////////////////////////
    //// Notifications

    setupNotifications() {
        // Auto-wires async notif_<name>(args) methods to notification '<name>'.
        this.bga.notifications.setupPromiseNotifications({
            // logger: console.log
        });
    }

    async notif_cardPlayed(args: any) {
        document.getElementById(`card-${args.card_id}`)?.remove();
    }
}
