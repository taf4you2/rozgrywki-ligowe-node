// Typ opisuje komplet danych zapisywanych dla jednego występu zawodnika.
export type AppearanceInput = {
    playerId: number;
    minuteIn: number;
    minuteOut: number | null;
    yellowCards: number;
    redCards: number;
    fouls: number;
};

// Typ opisuje występ zwracany przez API razem z meczem, do którego należy.
export type Appearance = AppearanceInput & {
    id: number;
    matchId: number;
};
