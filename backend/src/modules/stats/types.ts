// Typ opisuje wspólne dane zawodnika używane w każdym rankingu.
export type PlayerStatBase = {
    playerId: number;
    firstName: string;
    lastName: string;
    clubId: number;
    clubName: string;
};

// Typ opisuje pozycję w klasyfikacji strzelców.
export type TopScorerStat = PlayerStatBase & {
    goals: number;
};

// Typ opisuje statystyki kartek i fauli zawodnika.
export type CardStat = PlayerStatBase & {
    appearances: number;
    yellowCards: number;
    redCards: number;
    totalCards: number;
    fouls: number;
};

// Typ opisuje liczbę występów zawodnika.
export type AppearanceStat = PlayerStatBase & {
    appearances: number;
};
