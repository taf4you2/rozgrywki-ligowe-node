import type { QueryResultRow } from 'pg';

import { query } from '../../db/query.js';
import { AppError } from '../../errors/app-error.js';

import type { Appearance, AppearanceInput } from './types.js';

// Typ odwzorowuje jeden wiersz tabeli match_appearances.
type AppearanceRow = QueryResultRow & {
    id: number;
    match_id: number;
    player_id: number;
    minute_in: number;
    minute_out: number | null;
    yellow_cards: number;
    red_cards: number;
    fouls: number;
};

// Typ opisuje odpowiedź zapytania sprawdzającego istnienie rekordu.
type ExistsRow = QueryResultRow & {
    exists: boolean;
};

// Typ opisuje minimalny wynik usuwania występu.
type DeletedAppearanceRow = QueryResultRow & {
    id: number;
};

// Klasa zawiera wszystkie zapytania SQL związane z występami.
export class AppearancesRepository {
    // Metoda pobiera występy jednego meczu w kolejności wejścia zawodników.
    public async findByMatchId(matchId: number): Promise<Appearance[]> {
        const result = await query<AppearanceRow>(
            `
                SELECT
                    id,
                    match_id,
                    player_id,
                    minute_in,
                    minute_out,
                    yellow_cards,
                    red_cards,
                    fouls
                FROM match_appearances
                WHERE match_id = $1
                ORDER BY minute_in ASC, id ASC
            `,
            [matchId],
        );

        return result.rows.map(mapAppearanceRow);
    }

    // Metoda pobiera występ potrzebny przed aktualizacją.
    public async findById(id: number): Promise<Appearance | null> {
        const result = await query<AppearanceRow>(
            `
                SELECT
                    id,
                    match_id,
                    player_id,
                    minute_in,
                    minute_out,
                    yellow_cards,
                    red_cards,
                    fouls
                FROM match_appearances
                WHERE id = $1
            `,
            [id],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapAppearanceRow(row);
    }

    // Metoda sprawdza, czy mecz istnieje przed pobraniem albo dodaniem występu.
    public async matchExists(matchId: number): Promise<boolean> {
        return this.resourceExists('matches', matchId);
    }

    // Metoda sprawdza, czy zawodnik istnieje przed przypisaniem go do występu.
    public async playerExists(playerId: number): Promise<boolean> {
        return this.resourceExists('players', playerId);
    }

    // Metoda tworzy występ powiązany z identyfikatorem meczu ze ścieżki.
    public async create(matchId: number, input: AppearanceInput): Promise<Appearance> {
        const result = await query<AppearanceRow>(
            `
                INSERT INTO match_appearances (
                    match_id,
                    player_id,
                    minute_in,
                    minute_out,
                    yellow_cards,
                    red_cards,
                    fouls
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING
                    id,
                    match_id,
                    player_id,
                    minute_in,
                    minute_out,
                    yellow_cards,
                    red_cards,
                    fouls
            `,
            [
                matchId,
                input.playerId,
                input.minuteIn,
                input.minuteOut,
                input.yellowCards,
                input.redCards,
                input.fouls,
            ],
        );

        const row = result.rows[0];

        if (row === undefined) {
            throw AppError.internal('Could not create appearance');
        }

        return mapAppearanceRow(row);
    }

    // Metoda aktualizuje dane występu bez zmiany meczu, do którego występ należy.
    public async update(id: number, input: AppearanceInput): Promise<Appearance | null> {
        const result = await query<AppearanceRow>(
            `
                UPDATE match_appearances
                SET
                    player_id = $2,
                    minute_in = $3,
                    minute_out = $4,
                    yellow_cards = $5,
                    red_cards = $6,
                    fouls = $7
                WHERE id = $1
                RETURNING
                    id,
                    match_id,
                    player_id,
                    minute_in,
                    minute_out,
                    yellow_cards,
                    red_cards,
                    fouls
            `,
            [
                id,
                input.playerId,
                input.minuteIn,
                input.minuteOut,
                input.yellowCards,
                input.redCards,
                input.fouls,
            ],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapAppearanceRow(row);
    }

    // Metoda usuwa jeden występ i zwraca prostą informację o wyniku operacji.
    public async delete(id: number): Promise<boolean> {
        const result = await query<DeletedAppearanceRow>(
            `
                DELETE FROM match_appearances
                WHERE id = $1
                RETURNING id
            `,
            [id],
        );

        return result.rowCount === 1;
    }

    // Metoda pomocnicza wykonuje prosty SELECT EXISTS dla zaufanej nazwy tabeli.
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

// Funkcja zamienia nazwy kolumn PostgreSQL na format odpowiedzi API.
function mapAppearanceRow(row: AppearanceRow): Appearance {
    return {
        id: row.id,
        matchId: row.match_id,
        playerId: row.player_id,
        minuteIn: row.minute_in,
        minuteOut: row.minute_out,
        yellowCards: row.yellow_cards,
        redCards: row.red_cards,
        fouls: row.fouls,
    };
}
