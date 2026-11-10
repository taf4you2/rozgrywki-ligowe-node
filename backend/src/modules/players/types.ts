// Typ opisuje zawodnika zwracanego przez publiczne API.
// Używa camelCase, aby oddzielić kontrakt HTTP od kolumn PostgreSQL zapisanych w snake_case.
export type Player = {
    id: number;
    clubId: number;
    firstName: string;
    lastName: string;
};

// Typ opisuje dane wymagane podczas tworzenia albo pełnej aktualizacji zawodnika.
// Nie zawiera id, ponieważ identyfikator generuje baza danych.
export type PlayerInput = {
    clubId: number;
    firstName: string;
    lastName: string;
};

// Typ opisuje dane wymagane podczas transferu zawodnika.
// Operacja zmienia wyłącznie klub, dlatego nie przyjmuje imienia ani nazwiska.
export type PlayerTransferInput = {
    clubId: number;
};

// Typ opisuje opcjonalne filtry endpointu GET /api/v1/players.
export type PlayerListFilters = {
    clubId?: number;
    search?: string;
};
