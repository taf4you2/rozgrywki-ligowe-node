import type { QueryResultRow } from 'pg';

import { query } from '../../db/query.js';
import { AppError } from '../../errors/app-error.js';

import type { Goal, GoalInput } from './types.js';

// Typ odwzorowuje jeden wiersz tabeli goals.
type GoalRow = QueryResultRow & {
    id: number;
    match_id: number;
    scorer_id: number;
    assistant_id: number | null;
    minute: number;
    is_own_goal: boolean;
    created_at: Date;
};

// Typ opisuje wynik sprawdzania istnienia meczu albo zawodnika.
type ExistsRow = QueryResultRow & {
    exists: boolean;
};

// Typ opisuje minimalny wynik usuwania bramki.
type DeletedGoalRow = QueryResultRow & {
    id: number;
};

// Klasa przechowuje SQL potrzebny do obsługi bramek.
export class GoalsRepository {
    // Metoda pobiera bramki meczu w kolejności ich zdobycia.
    public async findByMatchId(matchId: number): Promise<Goal[]> {
        const result = await query<GoalRow>(
            `
                SELECT
                    id,
                    match_id,
                    scorer_id,
                    assistant_id,
                    minute,
                    is_own_goal,
                    created_at
                FROM goals
                WHERE match_id = $1
                ORDER BY minute ASC, id ASC
            `,
            [matchId],
        );

        return result.rows.map(mapGoalRow);
    }

    // Metoda pobiera jedną bramkę potrzebną podczas aktualizacji.
    public async findById(id: number): Promise<Goal | null> {
        const result = await query<GoalRow>(
            `
                SELECT
                    id,
                    match_id,
                    scorer_id,
                    assistant_id,
                    minute,
                    is_own_goal,
                    created_at
                FROM goals
                WHERE id = $1
            `,
            [id],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapGoalRow(row);
    }

    // Metoda sprawdza, czy podany mecz istnieje.
    public async matchExists(matchId: number): Promise<boolean> {
        return this.resourceExists('matches', matchId);
    }

    // Metoda sprawdza, czy podany zawodnik istnieje.
    public async playerExists(playerId: number): Promise<boolean> {
        return this.resourceExists('players', playerId);
    }

    // Metoda tworzy bramkę przypisaną do meczu ze ścieżki URL.
    public async create(matchId: number, input: GoalInput): Promise<Goal> {
        const result = await query<GoalRow>(
            `
                INSERT INTO goals (
                    match_id,
                    scorer_id,
                    assistant_id,
                    minute,
                    is_own_goal
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    id,
                    match_id,
                    scorer_id,
                    assistant_id,
                    minute,
                    is_own_goal,
                    created_at
            `,
            [
                matchId,
                input.scorerId,
                input.assistantId,
                input.minute,
                input.isOwnGoal,
            ],
        );

        const row = result.rows[0];

        if (row === undefined) {
            throw AppError.internal('Could not create goal');
        }

        return mapGoalRow(row);
    }

    // Metoda aktualizuje bramkę bez zmiany meczu, do którego należy.
    public async update(id: number, input: GoalInput): Promise<Goal | null> {
        const result = await query<GoalRow>(
            `
                UPDATE goals
                SET
                    scorer_id = $2,
                    assistant_id = $3,
                    minute = $4,
                    is_own_goal = $5
                WHERE id = $1
                RETURNING
                    id,
                    match_id,
                    scorer_id,
                    assistant_id,
                    minute,
                    is_own_goal,
                    created_at
            `,
            [
                id,
                input.scorerId,
                input.assistantId,
                input.minute,
                input.isOwnGoal,
            ],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapGoalRow(row);
    }

    // Metoda usuwa bramkę i informuje, czy rekord istniał.
    public async delete(id: number): Promise<boolean> {
        const result = await query<DeletedGoalRow>(
            `
                DELETE FROM goals
                WHERE id = $1
                RETURNING id
            `,
            [id],
        );

        return result.rowCount === 1;
    }

    // Metoda pomocnicza ogranicza nazwę tabeli do dwóch znanych wartości.
    private async resourceExists(
        table: 'matches' | 'players',
        id: number,
    ): Promise<boolean> {
        const result = await query<ExistsRow>(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM ${table}
                    WHERE id = $1
                ) AS exists
            `,
            [id],
        );

        return result.rows[0]?.exists ?? false;
    }
}

// Funkcja mapuje nazwy kolumn i zamienia datę na tekst ISO.
function mapGoalRow(row: GoalRow): Goal {
    return {
        id: row.id,
        matchId: row.match_id,
        scorerId: row.scorer_id,
        assistantId: row.assistant_id,
        minute: row.minute,
        isOwnGoal: row.is_own_goal,
        createdAt: row.created_at.toISOString(),
    };
}
