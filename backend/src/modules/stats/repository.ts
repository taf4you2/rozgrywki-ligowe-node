import type { QueryResultRow } from 'pg';

import { query } from '../../db/query.js';

import type { AppearanceStat, CardStat, TopScorerStat } from './types.js';

// Typ odwzorowuje wiersz klasyfikacji strzelców zwrócony przez SQL.
type TopScorerRow = QueryResultRow & {
    player_id: number;
    first_name: string;
    last_name: string;
    club_id: number;
    club_name: string;
    goals: number;
};

// Typ odwzorowuje wiersz rankingu kartek.
type CardRow = QueryResultRow & {
    player_id: number;
    first_name: string;
    last_name: string;
    club_id: number;
    club_name: string;
    appearances: number;
    yellow_cards: number;
    red_cards: number;
    total_cards: number;
    fouls: number;
};

// Typ odwzorowuje wiersz rankingu występów.
type AppearanceRow = QueryResultRow & {
    player_id: number;
    first_name: string;
    last_name: string;
    club_id: number;
    club_name: string;
    appearances: number;
};

// Klasa przechowuje zapytania agregujące statystyki.
export class StatsRepository {
    // Metoda liczy gole bez goli samobójczych i ogranicza wynik parametrem limit.
    public async findTopScorers(limit: number): Promise<TopScorerStat[]> {
        const result = await query<TopScorerRow>(
            `
                SELECT
                    p.id AS player_id,
                    p.first_name,
                    p.last_name,
                    c.id AS club_id,
                    c.name AS club_name,
                    COUNT(g.id)::integer AS goals
                FROM goals g
                JOIN players p ON p.id = g.scorer_id
                JOIN clubs c ON c.id = p.club_id
                WHERE g.is_own_goal = false
                GROUP BY
                    p.id,
                    p.first_name,
                    p.last_name,
                    c.id,
                    c.name
                ORDER BY goals DESC, p.last_name ASC, p.first_name ASC
                LIMIT $1
            `,
            [limit],
        );

        return result.rows.map(mapTopScorerRow);
    }

    // Metoda sumuje kartki oraz faule ze wszystkich występów zawodnika.
    public async findCards(limit: number): Promise<CardStat[]> {
        const result = await query<CardRow>(
            `
                SELECT
                    p.id AS player_id,
                    p.first_name,
                    p.last_name,
                    c.id AS club_id,
                    c.name AS club_name,
                    COUNT(ma.id)::integer AS appearances,
                    SUM(ma.yellow_cards)::integer AS yellow_cards,
                    SUM(ma.red_cards)::integer AS red_cards,
                    (SUM(ma.yellow_cards) + SUM(ma.red_cards))::integer AS total_cards,
                    SUM(ma.fouls)::integer AS fouls
                FROM match_appearances ma
                JOIN players p ON p.id = ma.player_id
                JOIN clubs c ON c.id = p.club_id
                GROUP BY
                    p.id,
                    p.first_name,
                    p.last_name,
                    c.id,
                    c.name
                ORDER BY
                    total_cards DESC,
                    red_cards DESC,
                    yellow_cards DESC,
                    p.last_name ASC
                LIMIT $1
            `,
            [limit],
        );

        return result.rows.map(mapCardRow);
    }

    // Metoda liczy występy każdego zawodnika i tworzy prosty ranking aktywności.
    public async findAppearances(limit: number): Promise<AppearanceStat[]> {
        const result = await query<AppearanceRow>(
            `
                SELECT
                    p.id AS player_id,
                    p.first_name,
                    p.last_name,
                    c.id AS club_id,
                    c.name AS club_name,
                    COUNT(ma.id)::integer AS appearances
                FROM match_appearances ma
                JOIN players p ON p.id = ma.player_id
                JOIN clubs c ON c.id = p.club_id
                GROUP BY
                    p.id,
                    p.first_name,
                    p.last_name,
                    c.id,
                    c.name
                ORDER BY appearances DESC, p.last_name ASC, p.first_name ASC
                LIMIT $1
            `,
            [limit],
        );

        return result.rows.map(mapAppearanceRow);
    }
}

// Funkcja mapuje klasyfikację strzelców na kontrakt API.
function mapTopScorerRow(row: TopScorerRow): TopScorerStat {
    return {
        playerId: row.player_id,
        firstName: row.first_name,
        lastName: row.last_name,
        clubId: row.club_id,
        clubName: row.club_name,
        goals: row.goals,
    };
}

// Funkcja mapuje statystyki kartek na kontrakt API.
function mapCardRow(row: CardRow): CardStat {
    return {
        playerId: row.player_id,
        firstName: row.first_name,
        lastName: row.last_name,
        clubId: row.club_id,
        clubName: row.club_name,
        appearances: row.appearances,
        yellowCards: row.yellow_cards,
        redCards: row.red_cards,
        totalCards: row.total_cards,
        fouls: row.fouls,
    };
}

// Funkcja mapuje ranking występów na kontrakt API.
function mapAppearanceRow(row: AppearanceRow): AppearanceStat {
    return {
        playerId: row.player_id,
        firstName: row.first_name,
        lastName: row.last_name,
        clubId: row.club_id,
        clubName: row.club_name,
        appearances: row.appearances,
    };
}
