import type { QueryResultRow } from 'pg';

import { query } from '../../db/query.js';
import { AppError } from '../../errors/app-error.js';

import type {
    Player,
    PlayerInput,
    PlayerListFilters,
} from './types.js';

// Typ odwzorowuje kolumny tabeli players w formacie zwracanym przez PostgreSQL.
type PlayerRow = QueryResultRow & {
    id: number;
    club_id: number;
    first_name: string;
    last_name: string;
};

// Typ opisuje minimalny wynik DELETE ... RETURNING.
type DeletedPlayerRow = QueryResultRow & {
    id: number;
};

// Typ opisuje wynik zapytania sprawdzającego istnienie klubu.
type ClubExistsRow = QueryResultRow & {
    exists: boolean;
};

// Klasa przechowuje wszystkie zapytania SQL modułu zawodników.
// Oddziela warstwę bazy danych od reguł biznesowych i obsługi HTTP.
export class PlayersRepository {
    // Metoda pobiera zawodników z opcjonalnym filtrem klubu i wyszukiwaniem po imieniu lub nazwisku.
    public async findAll(filters: PlayerListFilters): Promise<Player[]> {
        const conditions: string[] = [];
        const values: unknown[] = [];

        if (filters.clubId !== undefined) {
            const parameterIndex = values.push(filters.clubId);

            conditions.push(`p.club_id = $${parameterIndex}`);
        }

        // Warunek używa ILIKE, aby wyszukiwanie nie rozróżniało wielkości liter.
        if (filters.search !== undefined) {
            const parameterIndex = values.push(`%${filters.search}%`);

            conditions.push(`
                (
                    p.first_name ILIKE $${parameterIndex}
                    OR p.last_name ILIKE $${parameterIndex}
                    OR concat_ws(' ', p.first_name, p.last_name) ILIKE $${parameterIndex}
                )
            `);
        }

        // Fragment WHERE powstaje wyłącznie z kontrolowanych fragmentów kodu.
        // Wartość użytkownika pozostaje osobnym parametrem zapytania.
        const whereClause =
            conditions.length === 0
                ? ''
                : `WHERE ${conditions.join(' AND ')}`;

        const result = await query<PlayerRow>(
            `
                SELECT
                    p.id,
                    p.club_id,
                    p.first_name,
                    p.last_name
                FROM players p
                ${whereClause}
                ORDER BY
                    p.last_name ASC,
                    p.first_name ASC,
                    p.id ASC
            `,
            values,
        );

        return result.rows.map(mapPlayerRow);
    }

    // Metoda pobiera jednego zawodnika po kluczu głównym.
    // Zwraca null, aby serwis mógł zamienić brak rekordu na błąd 404.
    public async findById(id: number): Promise<Player | null> {
        const result = await query<PlayerRow>(
            `
                SELECT
                    id,
                    club_id,
                    first_name,
                    last_name
                FROM players
                WHERE id = $1
            `,
            [id],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapPlayerRow(row);
    }

    // Metoda sprawdza istnienie klubu przed przypisaniem do niego zawodnika.
    public async clubExists(clubId: number): Promise<boolean> {
        const result = await query<ClubExistsRow>(
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

    // Metoda tworzy zawodnika i od razu zwraca rekord utworzony przez bazę.
    public async create(input: PlayerInput): Promise<Player> {
        const result = await query<PlayerRow>(
            `
                INSERT INTO players (
                    club_id,
                    first_name,
                    last_name
                )
                VALUES ($1, $2, $3)
                RETURNING
                    id,
                    club_id,
                    first_name,
                    last_name
            `,
            [
                input.clubId,
                input.firstName,
                input.lastName,
            ],
        );

        const row = result.rows[0];

        if (row === undefined) {
            throw AppError.internal('Could not create player');
        }

        return mapPlayerRow(row);
    }

    // Metoda wykonuje pełną aktualizację zawodnika zgodną z semantyką PUT.
    public async update(
        id: number,
        input: PlayerInput,
    ): Promise<Player | null> {
        const result = await query<PlayerRow>(
            `
                UPDATE players
                SET
                    club_id = $2,
                    first_name = $3,
                    last_name = $4
                WHERE id = $1
                RETURNING
                    id,
                    club_id,
                    first_name,
                    last_name
            `,
            [
                id,
                input.clubId,
                input.firstName,
                input.lastName,
            ],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapPlayerRow(row);
    }

    // Metoda zmienia wyłącznie klub zawodnika, ponieważ transfer jest częściową aktualizacją.
    public async transfer(
        id: number,
        clubId: number,
    ): Promise<Player | null> {
        const result = await query<PlayerRow>(
            `
                UPDATE players
                SET club_id = $2
                WHERE id = $1
                RETURNING
                    id,
                    club_id,
                    first_name,
                    last_name
            `,
            [id, clubId],
        );

        const row = result.rows[0];

        return row === undefined ? null : mapPlayerRow(row);
    }

    // Metoda usuwa zawodnika i informuje serwis, czy rekord faktycznie istniał.
    // Klucz obcy w bazie blokuje usunięcie zawodnika powiązanego z występem albo bramką.
    public async delete(id: number): Promise<boolean> {
        const result = await query<DeletedPlayerRow>(
            `
                DELETE FROM players
                WHERE id = $1
                RETURNING id
            `,
            [id],
        );

        return result.rowCount === 1;
    }
}

// Funkcja zamienia nazwy kolumn snake_case na pola camelCase publicznego API.
function mapPlayerRow(row: PlayerRow): Player {
    return {
        id: row.id,
        clubId: row.club_id,
        firstName: row.first_name,
        lastName: row.last_name,
    };
}
