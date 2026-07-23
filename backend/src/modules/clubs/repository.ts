import type { QueryResultRow } from 'pg';

import { query } from '../../db/query.js';
import { AppError } from '../../errors/app-error.js';

import type { Club, ClubInput, ClubPlayer } from './types.js';

// Typ odwzorowuje wiersz tabeli clubs dokładnie w formie zwracanej przez sterownik pg.
// Zachowuje nazwy snake_case, ponieważ na tym poziomie odpowiada bezpośrednio strukturze bazy danych.
type ClubRow = QueryResultRow & {
    id: number;
    name: string;
    city: string;
    created_at: Date;
    updated_at: Date;
};

// Typ odwzorowuje kolumny tabeli players potrzebne endpointowi zawodników klubu.
type PlayerRow = QueryResultRow & {
    id: number;
    club_id: number;
    first_name: string;
    last_name: string;
};

// Typ opisuje minimalny wynik DELETE ... RETURNING.
// Repozytorium potrzebuje tylko identyfikatora, aby potwierdzić, że baza rzeczywiście usunęła rekord.
type DeletedClubRow = QueryResultRow & {
    id: number;
};

// Klasa izoluje wszystkie zapytania SQL modułu klubów.
// Dzięki temu kontroler i serwis nie zależą od składni PostgreSQL ani od nazw kolumn w bazie.
export class ClubsRepository {
    // Metoda pobiera wszystkie kluby i ustala stabilną kolejność wyników.
    // Dodatkowe sortowanie po id zapewnia przewidywalny wynik także dla klubów o tej samej nazwie.
    public async findAll(): Promise<Club[]> {
        const result = await query<ClubRow>(`
            SELECT id, name, city, created_at, updated_at
            FROM clubs
            ORDER BY name ASC, id ASC
        `);

        // Mapper zamienia każdy surowy wiersz bazy na kontrakt publicznego API.
        return result.rows.map(mapClubRow);
    }

    // Metoda wyszukuje pojedynczy klub po jego kluczu głównym.
    // Zwraca null zamiast rzucać błąd, ponieważ decyzja o odpowiedzi 404 należy do warstwy serwisu.
    public async findById(id: number): Promise<Club | null> {
        const result = await query<ClubRow>(
            `
                SELECT id, name, city, created_at, updated_at
                FROM clubs
                WHERE id = $1
            `,
            [id],
        );

        // Zapytanie używa parametru $1, aby dane użytkownika nie były doklejane bezpośrednio do SQL.
        const row = result.rows[0];

        return row === undefined ? null : mapClubRow(row);
    }

    // Metoda zapisuje nowy klub i od razu pobiera wartości wygenerowane przez bazę.
    // Klauzula RETURNING eliminuje potrzebę wykonywania drugiego zapytania SELECT.
    public async create(input: ClubInput): Promise<Club> {
        const result = await query<ClubRow>(
            `
                INSERT INTO clubs (name, city)
                VALUES ($1, $2)
                RETURNING id, name, city, created_at, updated_at
            `,
            [input.name, input.city],
        );

        const row = result.rows[0];

        // Brak wiersza po udanym INSERT oznacza niespodziewaną niespójność, dlatego metoda zgłasza błąd 500.
        if (row === undefined) {
            throw AppError.internal('Could not create club');
        }

        return mapClubRow(row);
    }

    // Metoda wykonuje pełną aktualizację pól obsługiwanych przez PUT.
    // Ustawia updated_at w bazie, aby znacznik czasu opisywał rzeczywisty moment zmiany.
    public async update(id: number, input: ClubInput): Promise<Club | null> {
        const result = await query<ClubRow>(
            `
                UPDATE clubs
                SET
                    name = $2,
                    city = $3,
                    updated_at = now()
                WHERE id = $1
                RETURNING id, name, city, created_at, updated_at
            `,
            [id, input.name, input.city],
        );

        const row = result.rows[0];

        // Brak zwróconego wiersza oznacza, że klub o podanym identyfikatorze nie istnieje.
        return row === undefined ? null : mapClubRow(row);
    }

    // Metoda usuwa klub i zwraca informację, czy jakikolwiek rekord został usunięty.
    // Ograniczenia ON DELETE RESTRICT pozostają w bazie i blokują klub powiązany z zawodnikiem albo meczem.
    public async delete(id: number): Promise<boolean> {
        const result = await query<DeletedClubRow>(
            `
                DELETE FROM clubs
                WHERE id = $1
                RETURNING id
            `,
            [id],
        );

        return result.rowCount === 1;
    }

    // Metoda pobiera zawodników należących do wskazanego klubu.
    // Sortuje listę alfabetycznie, aby API zwracało stabilny wynik bez dodatkowej pracy po stronie klienta.
    public async findPlayersByClubId(clubId: number): Promise<ClubPlayer[]> {
        const result = await query<PlayerRow>(
            `
                SELECT id, club_id, first_name, last_name
                FROM players
                WHERE club_id = $1
                ORDER BY last_name ASC, first_name ASC, id ASC
            `,
            [clubId],
        );

        return result.rows.map(mapPlayerRow);
    }
}

// Funkcja oddziela format bazy od formatu API.
// Zamienia nazwy snake_case na camelCase oraz obiekty Date na tekst ISO zgodny z JSON.
function mapClubRow(row: ClubRow): Club {
    return {
        id: row.id,
        name: row.name,
        city: row.city,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
    };
}

// Funkcja mapuje podstawowe dane zawodnika bez dołączania pól, których nie zawiera initial_schema.sql.
function mapPlayerRow(row: PlayerRow): ClubPlayer {
    return {
        id: row.id,
        clubId: row.club_id,
        firstName: row.first_name,
        lastName: row.last_name,
    };
}
