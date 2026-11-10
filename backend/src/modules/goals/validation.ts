import { AppError } from '../../errors/app-error.js';

import type { GoalInput } from './types.js';

// Stała odpowiada maksymalnej wartości typu integer w PostgreSQL.
const MAX_DATABASE_INTEGER = 2_147_483_647;

// Zbiór opisuje pola obsługiwane podczas zapisu bramki.
const allowedGoalFields = new Set([
    'scorerId',
    'assistantId',
    'minute',
    'isOwnGoal',
]);

// Funkcja sprawdza identyfikator bramki pobrany z adresu.
export function parseGoalId(rawId: string | undefined): number {
    return parsePathId(rawId, 'Goal id');
}

// Funkcja sprawdza identyfikator meczu dla endpointu zagnieżdżonego.
export function parseGoalMatchId(rawId: string | undefined): number {
    return parsePathId(rawId, 'Match id');
}

// Funkcja sprawdza dane nowej bramki i używa wartości domyślnych z bazy.
export function validateCreateGoalInput(body: unknown): GoalInput {
    return validateGoalInput(body, true);
}

// Funkcja sprawdza pełną aktualizację bramki.
export function validateUpdateGoalInput(body: unknown): GoalInput {
    return validateGoalInput(body, false);
}

// Funkcja wykonuje wspólną walidację dla tworzenia i edycji.
function validateGoalInput(body: unknown, useDefaults: boolean): GoalInput {
    if (!isObject(body)) {
        throw AppError.badRequest('Request body must be a JSON object');
    }

    const fieldErrors: Record<string, string> = {};

    for (const field of Object.keys(body)) {
        if (!allowedGoalFields.has(field)) {
            fieldErrors[field] = 'Unknown field';
        }
    }

    const scorerId = readPositiveInteger(body, 'scorerId', fieldErrors);
    const assistantId = readAssistantId(body, fieldErrors, useDefaults);
    const minute = readNonNegativeInteger(body, 'minute', fieldErrors);
    const isOwnGoal = readBoolean(body, 'isOwnGoal', fieldErrors, useDefaults);

    if (
        scorerId !== undefined &&
        assistantId !== undefined &&
        assistantId !== null &&
        scorerId === assistantId
    ) {
        fieldErrors.assistantId = 'Assistant must be different from scorer';
    }

    if (
        scorerId === undefined ||
        assistantId === undefined ||
        minute === undefined ||
        isOwnGoal === undefined ||
        Object.keys(fieldErrors).length > 0
    ) {
        throw AppError.badRequest('Invalid request body', {
            fields: fieldErrors,
        });
    }

    return {
        scorerId,
        assistantId,
        minute,
        isOwnGoal,
    };
}

// Funkcja sprawdza dodatni identyfikator ze ścieżki.
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

// Funkcja sprawdza wymagany identyfikator strzelca.
function readPositiveInteger(
    body: Record<string, unknown>,
    field: 'scorerId',
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

// Funkcja sprawdza asystującego, który może mieć wartość null.
function readAssistantId(
    body: Record<string, unknown>,
    errors: Record<string, string>,
    useDefault: boolean,
): number | null | undefined {
    const value = body.assistantId;

    if (value === undefined && useDefault) {
        return null;
    }

    if (value === null) {
        return null;
    }

    if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value <= 0
    ) {
        errors.assistantId = 'Field must be null or a positive integer';
        return undefined;
    }

    if (!Number.isSafeInteger(value) || value > MAX_DATABASE_INTEGER) {
        errors.assistantId = 'Field is too large';
        return undefined;
    }

    return value;
}

// Funkcja sprawdza minutę bramki, która nie może być ujemna.
function readNonNegativeInteger(
    body: Record<string, unknown>,
    field: 'minute',
    errors: Record<string, string>,
): number | undefined {
    const value = body[field];

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

// Funkcja sprawdza flagę gola samobójczego i podczas POST domyślnie ustawia false.
function readBoolean(
    body: Record<string, unknown>,
    field: 'isOwnGoal',
    errors: Record<string, string>,
    useDefault: boolean,
): boolean | undefined {
    const value = body[field];

    if (value === undefined && useDefault) {
        return false;
    }

    if (typeof value !== 'boolean') {
        errors[field] = 'Field must be a boolean';
        return undefined;
    }

    return value;
}

// Funkcja pozwala bezpiecznie odczytywać pola z body JSON.
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
