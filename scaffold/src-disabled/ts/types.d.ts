interface YourGamePlayer extends Player {
    // any information you add on each result['players'] row in getAllDatas
}

interface YourGameGamedatas extends Gamedatas<YourGamePlayer> {
    // variables you set up in getAllDatas
    hand: any[];
    hand_counts: Record<string, number>;
}

/*
 * Types for your state args
 */
interface PlayerTurnArgs {
    playableCardsIds: number[];
}
