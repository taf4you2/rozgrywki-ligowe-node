import assert from 'node:assert/strict';
import test from 'node:test';

import { mapPostgresError } from '../src/db/errors.js';
import { AppError } from '../src/errors/app-error.js';
import {
    validateCreateAppearanceInput,
    validateUpdateAppearanceInput,
} from '../src/modules/appearances/validation.js';
import {
    validateCreateGoalInput,
    validateUpdateGoalInput,
} from '../src/modules/goals/validation.js';
import {
    parseMatchFilters,
    validateMatchInput,
} from '../src/modules/matches/validation.js';
import { parseStatsLimit } from '../src/modules/stats/validation.js';

// Test sprawdza poprawne dane meczu i normalizację daty do formatu ISO.
test('validateMatchInput returns a normalized match', () => {
    const input = validateMatchInput({
        homeClubId: 1,
        awayClubId: 2,
        matchDate: '2030-06-01T18:00:00+02:00',
        homeScore: null,
        awayScore: null,
    });

    assert.deepEqual(input, {
        homeClubId: 1,
        awayClubId: 2,
        matchDate: '2030-06-01T16:00:00.000Z',
        homeScore: null,
        awayScore: null,
    });
});

// Test sprawdza regułę zabraniającą meczu klubu z samym sobą.
test('validateMatchInput rejects equal clubs', () => {
    assertAppError(
        () =>
            validateMatchInput({
                homeClubId: 1,
                awayClubId: 1,
                matchDate: '2030-06-01T18:00:00Z',
                homeScore: null,
                awayScore: null,
            }),
        400,
    );
});

// Test sprawdza odczyt kilku filtrów terminarza.
test('parseMatchFilters reads supported filters', () => {
    const query = new URLSearchParams({
        clubId: '2',
        from: '2030-01-01T00:00:00Z',
        played: 'false',
    });

    assert.deepEqual(parseMatchFilters(query), {
        clubId: 2,
        from: '2030-01-01T00:00:00.000Z',
        played: false,
    });
});

// Test sprawdza wartości domyślne używane przy tworzeniu występu.
test('validateCreateAppearanceInput adds database defaults', () => {
    assert.deepEqual(validateCreateAppearanceInput({ playerId: 5 }), {
        playerId: 5,
        minuteIn: 0,
        minuteOut: null,
        yellowCards: 0,
        redCards: 0,
        fouls: 0,
    });
});

// Test sprawdza, czy minuta zejścia nie może być wcześniejsza od wejścia.
test('validateUpdateAppearanceInput rejects invalid minutes', () => {
    assertAppError(
        () =>
            validateUpdateAppearanceInput({
                playerId: 5,
                minuteIn: 20,
                minuteOut: 10,
                yellowCards: 0,
                redCards: 0,
                fouls: 0,
            }),
        400,
    );
});

// Test sprawdza wartości domyślne bramki bez asysty.
test('validateCreateGoalInput adds database defaults', () => {
    assert.deepEqual(
        validateCreateGoalInput({
            scorerId: 3,
            minute: 15,
        }),
        {
            scorerId: 3,
            assistantId: null,
            minute: 15,
            isOwnGoal: false,
        },
    );
});

// Test sprawdza, czy jedna osoba nie może być strzelcem i asystującym.
test('validateUpdateGoalInput rejects equal scorer and assistant', () => {
    assertAppError(
        () =>
            validateUpdateGoalInput({
                scorerId: 3,
                assistantId: 3,
                minute: 15,
                isOwnGoal: false,
            }),
        400,
    );
});

// Test sprawdza domyślny limit oraz jego górną granicę.
test('parseStatsLimit validates the ranking size', () => {
    assert.equal(parseStatsLimit(new URLSearchParams()), 10);
    assert.equal(parseStatsLimit(new URLSearchParams({ limit: '25' })), 25);

    assertAppError(
        () => parseStatsLimit(new URLSearchParams({ limit: '101' })),
        400,
    );
});

// Test sprawdza, czy mapper nie zwraca surowych szczegółów błędu bazy.
test('mapPostgresError hides PostgreSQL details', () => {
    const error = mapPostgresError({
        code: '23505',
        constraint: 'match_appearances_unique_player',
        detail: 'technical database detail',
    });

    assert.equal(error.statusCode, 409);
    assert.equal(error.message, 'Player already has an appearance in this match');
    assert.equal(error.details, undefined);
});

// Funkcja pomocnicza sprawdza status kontrolowanego błędu aplikacji.
function assertAppError(callback: () => unknown, statusCode: number): void {
    assert.throws(callback, (error: unknown) => {
        return error instanceof AppError && error.statusCode === statusCode;
    });
}
