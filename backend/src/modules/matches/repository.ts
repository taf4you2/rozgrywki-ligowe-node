import type { QueryResultRow } from 'pg';

import { query } from '../../db/query.js';
import { AppError } from '../../errors/app-error.js';

import type { Match, MatchInput, MatchListFilters } from './types.js';

// Typ odwzorowuje wiersz tabeli matches zwracany przez bibliotekę pg.
type MatchRow = QueryResultRow & {
    id: number;
    home_club_id: number;
    away_club_id: number;
    match_date: Date;
    home_score: number | null;
    away_score: number | null;
};

// Typ opisuje prostą odpowiedź sprawdzającą istnienie klubu.
type ExistsRow = QueryResultRow & {
    exists: boolean;
};

// Typ opisuje minimalny wynik usuwania meczu.
type DeletedMatchRow = QueryResultRow & {
    id: number;
};

// Klasa trzyma SQL modułu meczów w jednym miejscu.
// Dzięki temu kontroler nie musi wiedzieć, jak nazywają się kolumny w bazie.
export class MatchesRepository {
    // Metoda buduje listę meczów z filtrami przekazanymi przez klienta.
    public async findAll(filters: MatchListFilters): Promise<Match[]> {
        const conditions: string[] = [];
        const values: unknown[] = [];

        if (filters.clubId !== undefined) {
            const index = values.push(filters.clubId);
            conditions.push(`(home_club_id = $${index} OR away_club_id = $${index})`);
        }

        if (filters.from !== undefined) {
            const index = values.push(filters.from);
            conditions.push(`match_date >= $${index}`);
        }

        if (filters.to !== undefined) {
            const index = values.push(filters.to);
            conditions.push(`match_date <= $${index}`);
        }

        if (filters.played === true) {
            conditions.push('(home_score IS NOT NULL AND away_score IS NOT NULL)');
        }

        if (filters.played === false) {
            conditions.push('(home_score IS NULL OR away_score IS NULL)');
        }

        const whereClause =
            conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`;

        const result = await query<MatchRow>(
            `
                SELECT
                    id,
                    home_club_id,
                    away_club_id,
                    match_date,
                    home_score,
                    away_score
                FROM matches
                ${whereClause}
                ORDER BY match_date ASC, id ASC
            `,
            values,
        );

        return result.rows.map(mapMatchRow);
    }

    // Metoda pobiera jeden mecz po jego identyfikatorze.
    public async findById(id: number): Promise<Match | null> {
        const result = await query<MatchRow>(
            `
                SELECT
                    id,
                    home_club_id,
                    away_club_id,
                    match_date,
                    home_score,
                    away_score
                FROM matches
                WHERE id = $1
            `,
            [id],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapMatchRow(row);
    }

    // Metoda sprawdza klub przed zapisaniem go jako gospodarza albo gościa.
    public async clubExists(clubId: number): Promise<boolean> {
        const result = await query<ExistsRow>(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM clubs
                    WHERE id = $1
                ) AS exists
            `,
            [clubId],
        );

        return result.rows[0]?.exists ?? false;
    }

    // Metoda tworzy mecz i zwraca rekord zapisany przez bazę.
    public async create(input: MatchInput): Promise<Match> {
        const result = await query<MatchRow>(
            `
                INSERT INTO matches (
                    home_club_id,
                    away_club_id,
                    match_date,
                    home_score,
                    away_score
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    id,
                    home_club_id,
                    away_club_id,
                    match_date,
                    home_score,
                    away_score
            `,
            [
                input.homeClubId,
                input.awayClubId,
                input.matchDate,
                input.homeScore,
                input.awayScore,
            ],
        );

        const row = result.rows[0];

        if (row === undefined) {
            throw AppError.internal('Could not create match');
        }

        return mapMatchRow(row);
    }

    // Metoda aktualizuje wszystkie edytowalne pola meczu.
    public async update(id: number, input: MatchInput): Promise<Match | null> {
        const result = await query<MatchRow>(
            `
                UPDATE matches
                SET
                    home_club_id = $2,
                    away_club_id = $3,
                    match_date = $4,
                    home_score = $5,
                    away_score = $6
                WHERE id = $1
                RETURNING
                    id,
                    home_club_id,
                    away_club_id,
                    match_date,
                    home_score,
                    away_score
            `,
            [
                id,
                input.homeClubId,
                input.awayClubId,
                input.matchDate,
                input.homeScore,
                input.awayScore,
            ],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapMatchRow(row);
    }

    // Metoda usuwa mecz i informuje serwis, czy rekord istniał.
    // Baza usuwa razem z meczem jego występy i bramki przez ON DELETE CASCADE.
    public async delete(id: number): Promise<boolean> {
        const result = await query<DeletedMatchRow>(
            `
                DELETE FROM matches
                WHERE id = $1
                RETURNING id
            `,
            [id],
        );

        return result.rowCount === 1;
    }
}

// Funkcja zmienia nazwy pól z bazy i serializuje datę do tekstu ISO.
function mapMatchRow(row: MatchRow): Match {
    return {
        id: row.id,
        homeClubId: row.home_club_id,
        awayClubId: row.away_club_id,
        matchDate: row.match_date.toISOString(),
        homeScore: row.home_score,
        awayScore: row.away_score,
    };
}
