// Typ opisuje komplet danych potrzebnych do zapisania bramki.
export type GoalInput = {
    scorerId: number;
    assistantId: number | null;
    minute: number;
    isOwnGoal: boolean;
};

// Typ opisuje bramkę zwracaną przez API.
export type Goal = GoalInput & {
    id: number;
    matchId: number;
    createdAt: string;
};
