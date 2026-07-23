import { AppError } from '../../errors/app-error.js';

import type { ClubInput } from './types.js';

// Stała odzwierciedla maksymalną wartość kolumny integer w Postgre.
// Walidator odrzuca większą wartość przed wykonaniem zapytania, aby baza nie zwróciła technicznego błędu zakresu.
const MAX_DATABASE_INTEGER = 2_147_483_647;

// Zbiór stanowi białą listę pól obsługiwanych przez tabelę clubs z initial_schema.sql.
// Walidator odrzuca dodatkowe pola, aby dokumentacja domenowa nie rozszerzała przypadkowo kontraktu API.
const allowedClubFields = new Set(['name', 'city']);

// Funkcja zamienia parametr ścieżki na liczbę używaną przez serwis i repozytorium.
// Sprawdza format przed konwersją, ponieważ Number() zaakceptowałby również niepożądane zapisy, na przykład pusty tekst.
export function parseClubId(rawId: string | undefined): number {
    if (rawId === undefined || !/^[1-9]\d*$/.test(rawId)) {
        throw AppError.badRequest('ID must be a positive integer');
    }

    const id = Number(rawId);

    // Warunek chroni zarówno zakres bezpiecznych liczb JavaScript, jak i zakres typu integer w bazie.
    if (!Number.isSafeInteger(id) || id > MAX_DATABASE_INTEGER) {
        throw AppError.badRequest('ID is too large');
    }

    return id;
}

// Funkcja sprawdza całe body żądania i zwraca już oczyszczone dane wejściowe.
// Zwraca ClubInput dopiero po pełnej walidacji, dzięki czemu kolejne warstwy nie powtarzają tych samych kontroli.
export function validateClubInput(body: unknown): ClubInput {
    // Warunek odrzuca null, tablicę i wartości proste, ponieważ poprawny klub musi być obiektem JSON.
    if (!isObject(body)) {
        throw AppError.badRequest('Request body must be a JSON object');
    }

    // Obiekt zbiera wszystkie błędy pól, aby klient mógł poprawić całe żądanie po jednej odpowiedzi.
    const fieldErrors: Record<string, string> = {};

    // Pętla wykrywa pola spoza białej listy zamiast je ignorować.
    for (const field of Object.keys(body)) {
        if (!allowedClubFields.has(field)) {
            fieldErrors[field] = 'Unknown field';
        }
    }

    // Funkcja pomocnicza jednocześnie sprawdza typ, obecność, długość i usuwa skrajne spacje.
    const name = readRequiredString(body, 'name', 120, fieldErrors);
    const city = readRequiredString(body, 'city', 120, fieldErrors);

    // Warunek kończy obsługę kontrolowanym błędem 400, jeśli którekolwiek pole jest niepoprawne.
    if (name === undefined || city === undefined || Object.keys(fieldErrors).length > 0) {
        throw AppError.badRequest('Invalid request body', { fields: fieldErrors });
    }

    return { name, city };
}

// Funkcja odczytuje wymagane pole tekstowe i zapisuje jego błąd we wspólnym obiekcie.
// Zwraca undefined przy błędzie, aby główny walidator mógł zdecydować o odrzuceniu całego body.
function readRequiredString(
    body: Record<string, unknown>,
    field: 'name' | 'city',
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
        errors[field] = `Field cannot exceed ${maxLength} characters`;
        return undefined;
    }

    return normalizedValue;
}

// Funkcja pełni rolę type guarda i pozwala TypeScriptowi bezpiecznie traktować body jak obiekt z polami.
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
