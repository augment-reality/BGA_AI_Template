// ─── State: Player Turn ───────────────────────────────────────────────────────
// One handler class per server state, registered by the state's `name:` below.
class PlayerTurn {
    constructor(game, bga) {
        this.game = game;
        this.bga  = bga;
    }

    onEnteringState(args, isCurrentPlayerActive) {
        // Status bar title comes from the state's description/descriptionMyTurn
        // (PlayerTurn.php) — the framework substitutes ${actplayer}/${you} itself.
        // Don't override it here with setTitle(); a manual call doesn't get that
        // substitution and leaves ${actplayer} blank for non-active players.
        this.bga.statusBar.removeActionButtons();
        if (!isCurrentPlayerActive) {
            return;
        }

        // Make own hand cards clickable, using ids from PlayerTurn::getArgs()
        (args.playableCardsIds ?? []).forEach(cardId => {
            const el = document.getElementById(`card-${cardId}`);
            if (el) {
                el.classList.add('yourgame-playable');
                el.onclick = () => this.bga.actions.performAction('actPlayCard', { card_id: cardId });
            }
        });

        this.bga.statusBar.addActionButton(
            _('Pass'),
            () => this.bga.actions.performAction('actPass'),
            { color: 'secondary' }
        );
    }

    onLeavingState() {
        // Always clean up highlights and click handlers
        document.querySelectorAll('.yourgame-playable').forEach(el => {
            el.classList.remove('yourgame-playable');
            el.onclick = null;
        });
    }
}

// ─── Main Game Class ──────────────────────────────────────────────────────────
export class Game {
    constructor(bga) {
        this.bga       = bga;
        this.gamedatas = null;

        // Register all state handlers (key = state `name:` on the PHP side)
        bga.states.register('playerTurn', new PlayerTurn(this, bga));

        // Debug state changes in the console (remove before production):
        // this.bga.states.logger = console.log;
    }

    setup(gamedatas) {
        this.gamedatas = gamedatas;

        // Build the static layout
        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="yourgame-board"></div>
            <div id="player-tables"></div>
        `);

        // Per-player panels and tables — current player first
        const localId = this.bga.players.getCurrentPlayerId();
        Object.values(gamedatas.players)
            .sort((a, b) => {
                if (parseInt(a.id) === localId) return -1;
                if (parseInt(b.id) === localId) return  1;
                return parseInt(a.no) - parseInt(b.no);
            })
            .forEach(player => {
                this._buildPlayerPanel(player);
                this._buildPlayerTable(player);
            });

        // Render own hand
        this._renderHand(gamedatas.hand ?? []);

        this.setupNotifications();
    }

    // ─── UI builders ─────────────────────────────────────────────────────────

    _buildPlayerPanel(player) {
        const pid = String(player.id);
        const handCount = parseInt(this.gamedatas?.hand_counts?.[pid] ?? 0);
        this.bga.playerPanels.getElement(player.id).insertAdjacentHTML('beforeend', `
            <div>Cards: <span id="panel_cards_${pid}">${handCount}</span></div>
        `);
    }

    _buildPlayerTable(player) {
        const pid = String(player.id);
        const isLocal = parseInt(pid) === this.bga.players.getCurrentPlayerId();
        document.getElementById('player-tables').insertAdjacentHTML('beforeend', `
            <div id="player_area_${pid}" class="yourgame-player-area ${isLocal ? 'yourgame-player-area-own' : 'yourgame-player-area-other'}">
                <div class="yourgame-player-name" style="color:#${player.color}">${player.name}</div>
                <div id="${pid}_cards" class="yourgame-player-cards"></div>
            </div>
        `);
    }

    _renderHand(cards) {
        const localId = this.bga.players.getCurrentPlayerId();
        const handEl  = document.getElementById(`${localId}_cards`);
        if (!handEl) return;
        handEl.querySelectorAll('.yourgame-card').forEach(el => el.remove());
        cards.forEach(card => {
            handEl.insertAdjacentHTML('beforeend', this._cardHtml(card));
            this._attachCardTilt(document.getElementById(`card-${card.id}`));
        });
    }

    _cardHtml(card) {
        return `<div id="card-${card.id}" class="yourgame-card yourgame-card-type-${card.type}"
                     data-card-id="${card.id}" data-card-type="${card.type}"></div>`;
    }

    // Foil-card tilt: tracks the cursor over the card and drives the --rx/--ry
    // (tilt angle) and --mx/--my (glare position) CSS vars used by the sheen
    // in yourgame.css. Pure visual flourish — no game logic here.
    _attachCardTilt(el) {
        if (!el) return;
        const maxTiltDeg = 14;
        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width;
            const py = (e.clientY - rect.top) / rect.height;
            el.style.setProperty('--ry', `${(px - 0.5) * maxTiltDeg * 2}deg`);
            el.style.setProperty('--rx', `${(0.5 - py) * maxTiltDeg * 2}deg`);
            el.style.setProperty('--mx', `${px * 100}%`);
            el.style.setProperty('--my', `${py * 100}%`);
        });
        el.addEventListener('mouseleave', () => {
            el.style.setProperty('--rx', '0deg');
            el.style.setProperty('--ry', '0deg');
        });
    }

    _adjustHandCount(pid, delta) {
        const el = document.getElementById(`panel_cards_${pid}`);
        if (el) el.textContent = Math.max(0, (parseInt(el.textContent) || 0) + delta);
    }

    // ─── Animation helper (ghost slide; always resolves) ────────────────────
    // Default duration is deliberately long (2s, within the 1.5-3s house style) —
    // BGA's own defaults read as rushed/mechanical; slow, readable motion is the
    // template's default look. Tune per-notification, not here, if one specific
    // animation genuinely needs to be quicker.

    _animSlide(html, fromId, toId, ms = 2000) {
        if (!this.bga.gameui?.bgaAnimationsActive?.()) return Promise.resolve();
        const fromEl = document.getElementById(fromId);
        const toEl   = document.getElementById(toId);
        if (!fromEl || !toEl) return Promise.resolve();
        try {
            const anim = this.bga.gameui.slideTemporaryObject(html, 'game_play_area', fromEl.id, toEl.id, ms, 0);
            if (!anim) return Promise.resolve();
            const fallback = new Promise(resolve => setTimeout(resolve, ms + 200));
            return Promise.race([this.bga.gameui.bgaPlayDojoAnimation(anim), fallback]);
        } catch (_) {
            return Promise.resolve();
        }
    }

    // ─── Notifications ────────────────────────────────────────────────────────

    setupNotifications() {
        // Auto-wires every async notif_<name>(args) method to notification '<name>'.
        // Awaited promises sequence the animations.
        this.bga.notifications.setupPromiseNotifications({
            // logger: console.log   // uncomment to debug
        });
    }

    async notif_cardPlayed(args) {
        const pid = String(args.player_id);
        const cardEl = document.getElementById(`card-${args.card_id}`);
        // Only the local viewer's own hand renders real card elements (see
        // _renderHand — this scaffold doesn't visualize opponents' hands), so
        // there's nothing to animate here for anyone else's play. Ghost-slide the
        // real card to the board before removing it — see _animSlide's header
        // comment for why this defaults to a slow 2s rather than BGA's usual
        // snappier feel.
        if (cardEl) {
            const ghost = cardEl.outerHTML.replace(/\sid="[^"]*"/, '');
            await this._animSlide(ghost, `${pid}_cards`, 'yourgame-board');
        }
        cardEl?.remove();
        this._adjustHandCount(pid, -1);
    }

    async notif_playerPassed(_args) {
        // Log-only notification — nothing to animate.
    }
}
