import { AppError } from '../../errors/app-error.js';

import type { MatchInput, MatchListFilters } from './types.js';

// Stała odpowiada zakresowi typu integer użytego w PostgreSQL.
const MAX_DATABASE_INTEGER = 2_147_483_647;

// Zbiór pozwala walidatorowi odrzucić pola, których tabela matches nie posiada.
const allowedMatchFields = new Set([
    'homeClubId',
    'awayClubId',
    'matchDate',
    'homeScore',
    'awayScore',
]);

// Zbiór opisuje filtry obsługiwane przez endpoint listy meczów.
const allowedFilterFields = new Set([
    'clubId',
    'from',
    'to',
    'played',
]);

// Funkcja sprawdza identyfikator meczu pobrany ze ścieżki URL.
export function parseMatchId(rawId: string | undefined): number {
    return parsePathId(rawId, 'Match id');
}

// Funkcja sprawdza identyfikator meczu używany w zagnieżdżonych endpointach.
export function parseMatchPathId(rawId: string | undefined): number {
    return parsePathId(rawId, 'Match id');
}

// Funkcja sprawdza całe body meczu i zwraca wartości gotowe do przekazania serwisowi.
export function validateMatchInput(body: unknown): MatchInput {
    if (!isObject(body)) {
        throw AppError.badRequest('Request body must be a JSON object');
    }

    const fieldErrors: Record<string, string> = {};

    collectUnknownFields(body, allowedMatchFields, fieldErrors);

    const homeClubId = readRequiredPositiveInteger(body, 'homeClubId', fieldErrors);
    const awayClubId = readRequiredPositiveInteger(body, 'awayClubId', fieldErrors);
    const matchDate = readRequiredDate(body, 'matchDate', fieldErrors);
    const homeScore = readNullableScore(body, 'homeScore', fieldErrors);
    const awayScore = readNullableScore(body, 'awayScore', fieldErrors);

    if (
        homeClubId === undefined ||
        awayClubId === undefined ||
        matchDate === undefined ||
        homeScore === undefined ||
        awayScore === undefined ||
        Object.keys(fieldErrors).length > 0
    ) {
        throw AppError.badRequest('Invalid request body', {
            fields: fieldErrors,
        });
    }

    if (homeClubId === awayClubId) {
        throw AppError.badRequest('Home club and away club must be different');
    }

    return {
        homeClubId,
        awayClubId,
        matchDate,
        homeScore,
        awayScore,
    };
}

// Funkcja sprawdza filtry terminarza i normalizuje daty do formatu ISO.
export function parseMatchFilters(query: URLSearchParams): MatchListFilters {
    const fieldErrors: Record<string, string> = {};

    for (const field of new Set(query.keys())) {
        if (!allowedFilterFields.has(field)) {
            fieldErrors[field] = 'Unknown filter';
            continue;
        }

        if (query.getAll(field).length > 1) {
            fieldErrors[field] = 'Filter can be provided only once';
        }
    }

    const clubId = readOptionalIdFilter(query.get('clubId'), 'clubId', fieldErrors);
    const from = readOptionalDateFilter(query.get('from'), 'from', fieldErrors);
    const to = readOptionalDateFilter(query.get('to'), 'to', fieldErrors);
    const played = readOptionalBooleanFilter(query.get('played'), fieldErrors);

    if (
        from !== undefined &&
        to !== undefined &&
        new Date(from).getTime() > new Date(to).getTime()
    ) {
        fieldErrors.to = 'Filter must not be earlier than from';
    }

    if (Object.keys(fieldErrors).length > 0) {
        throw AppError.badRequest('Invalid query parameters', {
            fields: fieldErrors,
        });
    }

    return {
        ...(clubId === undefined ? {} : { clubId }),
        ...(from === undefined ? {} : { from }),
        ...(to === undefined ? {} : { to }),
        ...(played === undefined ? {} : { played }),
    };
}

// Funkcja wykonuje wspólne sprawdzenie liczbowego identyfikatora ze ścieżki.
function parsePathId(rawId: string | undefined, label: string): number {
    if (rawId === undefined || !/^[1-9]\d*$/.test(rawId)) {
        throw AppError.badRequest(`${label} must be a positive integer`);
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > MAX_DATABASE_INTEGER) {
        throw AppError.badRequest(`${label} is too large`);
    }

    return id;
}

// Funkcja zapisuje błąd dla pola, którego nie obsługuje dany endpoint.
function collectUnknownFields(
    body: Record<string, unknown>,
    allowedFields: ReadonlySet<string>,
    errors: Record<string, string>,
): void {
    for (const field of Object.keys(body)) {
        if (!allowedFields.has(field)) {
            errors[field] = 'Unknown field';
        }
    }
}

// Funkcja sprawdza wymagany identyfikator klubu zapisany w body JSON.
function readRequiredPositiveInteger(
    body: Record<string, unknown>,
    field: 'homeClubId' | 'awayClubId',
    errors: Record<string, string>,
): number | undefined {
    const value = body[field];

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value <= 0
    ) {
        errors[field] = 'Field must be a positive integer';
        return undefined;
    }

    if (!Number.isSafeInteger(value) || value > MAX_DATABASE_INTEGER) {
        errors[field] = 'Field is too large';
        return undefined;
    }

    return value;
}

// Funkcja sprawdza datę meczu i zapisuje ją w jednoznacznym formacie ISO.
function readRequiredDate(
    body: Record<string, unknown>,
    field: 'matchDate',
    errors: Record<string, string>,
): string | undefined {
    const value = body[field];

    if (typeof value !== 'string' || value.trim() === '') {
        errors[field] = 'Field must be a non-empty date string';
        return undefined;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        errors[field] = 'Field must contain a valid date';
        return undefined;
    }

    return date.toISOString();
}

// Funkcja sprawdza wynik, który może być liczbą nieujemną albo wartością null.
function readNullableScore(
    body: Record<string, unknown>,
    field: 'homeScore' | 'awayScore',
    errors: Record<string, string>,
): number | null | undefined {
    const value = body[field];

    if (value === null) {
        return null;
    }

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 0
    ) {
        errors[field] = 'Field must be null or a non-negative integer';
        return undefined;
    }

    if (!Number.isSafeInteger(value) || value > MAX_DATABASE_INTEGER) {
        errors[field] = 'Field is too large';
        return undefined;
    }

    return value;
}

// Funkcja sprawdza opcjonalny identyfikator klubu przekazany w query string.
function readOptionalIdFilter(
    rawValue: string | null,
    field: 'clubId',
    errors: Record<string, string>,
): number | undefined {
    if (rawValue === null) {
        return undefined;
    }

    if (!/^[1-9]\d*$/.test(rawValue)) {
        errors[field] = 'Filter must be a positive integer';
        return undefined;
    }

    const value = Number(rawValue);

    if (!Number.isSafeInteger(value) || value > MAX_DATABASE_INTEGER) {
        errors[field] = 'Filter is too large';
        return undefined;
    }

    return value;
}

// Funkcja sprawdza opcjonalną datę z query string i zwraca format ISO.
function readOptionalDateFilter(
    rawValue: string | null,
    field: 'from' | 'to',
    errors: Record<string, string>,
): string | undefined {
    if (rawValue === null) {
        return undefined;
    }

    const date = new Date(rawValue);

    if (rawValue.trim() === '' || Number.isNaN(date.getTime())) {
        errors[field] = 'Filter must contain a valid date';
        return undefined;
    }

    return date.toISOString();
}

// Funkcja przyjmuje tylko tekst true albo false, żeby filtr był jednoznaczny.
function readOptionalBooleanFilter(
    rawValue: string | null,
    errors: Record<string, string>,
): boolean | undefined {
    if (rawValue === null) {
        return undefined;
    }

    if (rawValue === 'true') {
        return true;
    }

    if (rawValue === 'false') {
        return false;
    }

    errors.played = 'Filter must be true or false';
    return undefined;
}

// Funkcja pozwala TypeScriptowi traktować poprawne body jak zwykły obiekt.
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
