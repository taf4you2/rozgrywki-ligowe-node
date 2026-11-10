import { AppError } from '../../errors/app-error.js';

// Stała ustala domyślną liczbę elementów rankingu.
const DEFAULT_LIMIT = 10;

// Stała chroni bazę przed zwróceniem zbyt dużej listy w jednym żądaniu.
const MAX_LIMIT = 100;

// Funkcja odczytuje limit i odrzuca wszystkie nieznane parametry query.
export function parseStatsLimit(query: URLSearchParams): number {
    const fieldErrors: Record<string, string> = {};

    for (const field of new Set(query.keys())) {
        if (field !== 'limit') {
            fieldErrors[field] = 'Unknown filter';
            continue;
        }

        if (query.getAll(field).length > 1) {
            fieldErrors[field] = 'Filter can be provided only once';
        }
    }

    const rawLimit = query.get('limit');
    let limit = DEFAULT_LIMIT;

    if (rawLimit !== null) {
        if (!/^[1-9]\d*$/.test(rawLimit)) {
            fieldErrors.limit = 'Filter must be a positive integer';
        } else {
            limit = Number(rawLimit);

            if (!Number.isSafeInteger(limit) || limit > MAX_LIMIT) {
                fieldErrors.limit = `Filter cannot be greater than ${MAX_LIMIT}`;
            }
        }
    }

    if (Object.keys(fieldErrors).length > 0) {
        throw AppError.badRequest('Invalid query parameters', {
            fields: fieldErrors,
        });
    }

    return limit;
}
