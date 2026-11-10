import { AppError } from '../../errors/app-error.js';

import type {
    PlayerInput,
    PlayerListFilters,
    PlayerTransferInput,
} from './types.js';

// Stała odpowiada maksymalnej wartości kolumny integer w PostgreSQL.
// Walidator odrzuca większą liczbę przed wykonaniem zapytania do bazy.
const MAX_DATABASE_INTEGER = 2_147_483_647;

// Stała ogranicza długość wyszukiwanego tekstu, aby endpoint nie przetwarzał niepotrzebnie dużego parametru.
const MAX_SEARCH_LENGTH = 200;

// Zbiór określa pola dozwolone podczas tworzenia i pełnej aktualizacji zawodnika.
const allowedPlayerFields = new Set([
    'clubId',
    'firstName',
    'lastName',
]);

// Zbiór określa jedyne pole obsługiwane przez operację transferu.
const allowedTransferFields = new Set(['clubId']);

// Zbiór określa parametry query obsługiwane przez listę zawodników.
const allowedFilterFields = new Set(['clubId', 'search']);

// Funkcja zamienia identyfikator ze ścieżki URL na liczbę.
// Sprawdza jego format przed przekazaniem wartości do serwisu.
export function parsePlayerId(rawId: string | undefined): number {
    if (rawId === undefined || !/^[1-9]\d*$/.test(rawId)) {
        throw AppError.badRequest('Player id must be a positive integer');
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id > MAX_DATABASE_INTEGER) {
        throw AppError.badRequest('Player id is too large');
    }

    return id;
}

// Funkcja sprawdza body używane przez POST oraz PUT.
// Zwraca oczyszczone dane dopiero po sprawdzeniu wszystkich wymaganych pól.
export function validatePlayerInput(body: unknown): PlayerInput {
    if (!isObject(body)) {
        throw AppError.badRequest(
            'Request body must be a JSON object',
        );
    }

    // Obiekt zbiera błędy poszczególnych pól, aby odpowiedź wskazała wszystkie problemy naraz.
    const fieldErrors: Record<string, string> = {};

    collectUnknownFields(
        body,
        allowedPlayerFields,
        fieldErrors,
    );

    const clubId = readRequiredInteger(
        body,
        'clubId',
        fieldErrors,
    );

    const firstName = readRequiredString(
        body,
        'firstName',
        80,
        fieldErrors,
    );

    const lastName = readRequiredString(
        body,
        'lastName',
        100,
        fieldErrors,
    );

    if (
        clubId === undefined ||
        firstName === undefined ||
        lastName === undefined ||
        Object.keys(fieldErrors).length > 0
    ) {
        throw AppError.badRequest('Invalid request body', {
            fields: fieldErrors,
        });
    }

    return {
        clubId,
        firstName,
        lastName,
    };
}

// Funkcja sprawdza body operacji transferu.
// Odrzuca dodatkowe pola, ponieważ transfer może zmienić wyłącznie clubId.
export function validatePlayerTransferInput(
    body: unknown,
): PlayerTransferInput {
    if (!isObject(body)) {
        throw AppError.badRequest(
            'Request body must be a JSON object',
        );
    }

    const fieldErrors: Record<string, string> = {};

    collectUnknownFields(
        body,
        allowedTransferFields,
        fieldErrors,
    );

    const clubId = readRequiredInteger(
        body,
        'clubId',
        fieldErrors,
    );

    if (
        clubId === undefined ||
        Object.keys(fieldErrors).length > 0
    ) {
        throw AppError.badRequest('Invalid request body', {
            fields: fieldErrors,
        });
    }

    return { clubId };
}

// Funkcja odczytuje i sprawdza filtry listy zawodników.
// Odrzuca nieznany albo wielokrotnie podany parametr, aby zachować jednoznaczny kontrakt endpointu.
export function parsePlayerFilters(
    query: URLSearchParams,
): PlayerListFilters {
    const fieldErrors: Record<string, string> = {};

    for (const field of new Set(query.keys())) {
        if (!allowedFilterFields.has(field)) {
            fieldErrors[field] = 'Unknown filter';
            continue;
        }

        if (query.getAll(field).length > 1) {
            fieldErrors[field] =
                'Filter can be provided only once';
        }
    }

    const clubId = readOptionalIntegerFilter(
        query.get('clubId'),
        'clubId',
        fieldErrors,
    );

    const search = readOptionalSearchFilter(
        query.get('search'),
        fieldErrors,
    );

    if (Object.keys(fieldErrors).length > 0) {
        throw AppError.badRequest('Invalid query parameters', {
            fields: fieldErrors,
        });
    }

    // Konstrukcja pomija pola niezdefiniowane, ponieważ projekt używa exactOptionalPropertyTypes.
    return {
        ...(clubId === undefined ? {} : { clubId }),
        ...(search === undefined ? {} : { search }),
    };
}

// Funkcja zapisuje błąd dla każdego pola, którego nie obsługuje dany rodzaj operacji.
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

// Funkcja sprawdza wymagany identyfikator przesłany w JSON.
// Akceptuje liczbę, ponieważ clubId w kontrakcie API jest wartością numeryczną.
function readRequiredInteger(
    body: Record<string, unknown>,
    field: 'clubId',
    errors: Record<string, string>,
): number | undefined {
    const value = body[field];

    if (value === undefined) {
        errors[field] = 'Field is required';
        return undefined;
    }

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value <= 0
    ) {
        errors[field] =
            'Field must be a positive integer';

        return undefined;
    }

    if (
        !Number.isSafeInteger(value) ||
        value > MAX_DATABASE_INTEGER
    ) {
        errors[field] = 'Field is too large';
        return undefined;
    }

    return value;
}

// Funkcja odczytuje wymagane pole tekstowe i normalizuje skrajne spacje.
// Limit długości odpowiada ograniczeniu varchar użytemu w schemacie bazy.
function readRequiredString(
    body: Record<string, unknown>,
    field: 'firstName' | 'lastName',
    maxLength: number,
    errors: Record<string, string>,
): string | undefined {
    const value = body[field];

    if (value === undefined) {
        errors[field] = 'Field is required';
        return undefined;
    }

    if (typeof value !== 'string') {
        errors[field] = 'Field must be a string';
        return undefined;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        errors[field] = 'Field cannot be empty';
        return undefined;
    }

    if (normalizedValue.length > maxLength) {
        errors[field] =
            `Field cannot exceed ${maxLength} characters`;

        return undefined;
    }

    return normalizedValue;
}

// Funkcja sprawdza opcjonalny filtr clubId zapisany w adresie URL.
function readOptionalIntegerFilter(
    rawValue: string | null,
    field: 'clubId',
    errors: Record<string, string>,
): number | undefined {
    if (rawValue === null) {
        return undefined;
    }

    const normalizedValue = rawValue.trim();

    if (!/^[1-9]\d*$/.test(normalizedValue)) {
        errors[field] =
            'Filter must be a positive integer';

        return undefined;
    }

    const value = Number(normalizedValue);

    if (
        !Number.isSafeInteger(value) ||
        value > MAX_DATABASE_INTEGER
    ) {
        errors[field] = 'Filter is too large';
        return undefined;
    }

    return value;
}

// Funkcja normalizuje opcjonalny tekst wyszukiwania.
// Odrzuca pustą wartość, ponieważ taki filtr nie wnosi żadnego ograniczenia.
function readOptionalSearchFilter(
    rawValue: string | null,
    errors: Record<string, string>,
): string | undefined {
    if (rawValue === null) {
        return undefined;
    }

    const normalizedValue = rawValue.trim();

    if (normalizedValue.length === 0) {
        errors.search = 'Filter cannot be empty';
        return undefined;
    }

    if (normalizedValue.length > MAX_SEARCH_LENGTH) {
        errors.search =
            `Filter cannot exceed ${MAX_SEARCH_LENGTH} characters`;

        return undefined;
    }

    return normalizedValue;
}

// Funkcja pełni rolę type guarda dla nieznanego body.
// Odrzuca null oraz tablicę, ponieważ poprawne body musi być obiektem JSON.
function isObject(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}