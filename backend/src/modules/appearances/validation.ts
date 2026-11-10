import { AppError } from '../../errors/app-error.js';

import type { AppearanceInput } from './types.js';

// Stała odpowiada maksymalnej wartości typu integer w bazie.
const MAX_DATABASE_INTEGER = 2_147_483_647;

// Zbiór opisuje wszystkie pola, które można zapisać w tabeli match_appearances.
const allowedAppearanceFields = new Set([
    'playerId',
    'minuteIn',
    'minuteOut',
    'yellowCards',
    'redCards',
    'fouls',
]);

// Funkcja sprawdza identyfikator występu pobrany ze ścieżki URL.
export function parseAppearanceId(rawId: string | undefined): number {
    return parsePathId(rawId, 'Appearance id');
}

// Funkcja sprawdza identyfikator meczu użyty w zagnieżdżonym endpointcie.
export function parseAppearanceMatchId(rawId: string | undefined): number {
    return parsePathId(rawId, 'Match id');
}

// Funkcja waliduje nowy występ i korzysta z takich samych wartości domyślnych jak baza.
export function validateCreateAppearanceInput(body: unknown): AppearanceInput {
    return validateAppearanceInput(body, true);
}

// Funkcja waliduje pełną aktualizację, dlatego wymaga podania wszystkich pól.
export function validateUpdateAppearanceInput(body: unknown): AppearanceInput {
    return validateAppearanceInput(body, false);
}

// Funkcja wykonuje wspólną walidację POST i PUT.
function validateAppearanceInput(body: unknown, useDefaults: boolean): AppearanceInput {
    if (!isObject(body)) {
        throw AppError.badRequest('Request body must be a JSON object');
    }

    const fieldErrors: Record<string, string> = {};

    for (const field of Object.keys(body)) {
        if (!allowedAppearanceFields.has(field)) {
            fieldErrors[field] = 'Unknown field';
        }
    }

    const playerId = readPositiveInteger(body, 'playerId', fieldErrors);
    const minuteIn = readNonNegativeInteger(
        body,
        'minuteIn',
        fieldErrors,
        useDefaults ? 0 : undefined,
    );
    const minuteOut = readMinuteOut(body, fieldErrors, useDefaults);
    const yellowCards = readNonNegativeInteger(
        body,
        'yellowCards',
        fieldErrors,
        useDefaults ? 0 : undefined,
    );
    const redCards = readNonNegativeInteger(
        body,
        'redCards',
        fieldErrors,
        useDefaults ? 0 : undefined,
    );
    const fouls = readNonNegativeInteger(
        body,
        'fouls',
        fieldErrors,
        useDefaults ? 0 : undefined,
    );

    if (
        minuteIn !== undefined &&
        minuteOut !== undefined &&
        minuteOut !== null &&
        minuteOut < minuteIn
    ) {
        fieldErrors.minuteOut = 'Field must not be smaller than minuteIn';
    }

    if (
        playerId === undefined ||
        minuteIn === undefined ||
        minuteOut === undefined ||
        yellowCards === undefined ||
        redCards === undefined ||
        fouls === undefined ||
        Object.keys(fieldErrors).length > 0
    ) {
        throw AppError.badRequest('Invalid request body', {
            fields: fieldErrors,
        });
    }

    return {
        playerId,
        minuteIn,
        minuteOut,
        yellowCards,
        redCards,
        fouls,
    };
}

// Funkcja sprawdza identyfikator i nie pozwala przekazać zera ani liczby ujemnej.
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

// Funkcja sprawdza wymagany identyfikator zawodnika z body.
function readPositiveInteger(
    body: Record<string, unknown>,
    field: 'playerId',
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

// Funkcja sprawdza licznik, który nie może być ujemny.
// Wartość domyślna działa tylko podczas tworzenia nowego występu.
function readNonNegativeInteger(
    body: Record<string, unknown>,
    field: 'minuteIn' | 'yellowCards' | 'redCards' | 'fouls',
    errors: Record<string, string>,
    defaultValue: number | undefined,
): number | undefined {
    const value = body[field];

    if (value === undefined && defaultValue !== undefined) {
        return defaultValue;
    }

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 0
    ) {
        errors[field] = 'Field must be a non-negative integer';
        return undefined;
    }

    if (!Number.isSafeInteger(value) || value > MAX_DATABASE_INTEGER) {
        errors[field] = 'Field is too large';
        return undefined;
    }

    return value;
}

// Funkcja sprawdza minutę zejścia, która może mieć wartość null.
function readMinuteOut(
    body: Record<string, unknown>,
    errors: Record<string, string>,
    useDefault: boolean,
): number | null | undefined {
    const value = body.minuteOut;

    if (value === undefined && useDefault) {
        return null;
    }

    if (value === null) {
        return null;
    }

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 0
    ) {
        errors.minuteOut = 'Field must be null or a non-negative integer';
        return undefined;
    }

    if (!Number.isSafeInteger(value) || value > MAX_DATABASE_INTEGER) {
        errors.minuteOut = 'Field is too large';
        return undefined;
    }

    return value;
}

// Funkcja pełni rolę prostego type guarda dla body JSON.
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
