import { AppError } from '../errors/app-error.js';

// Minimalny ksztalt bledu, jaki zwraca biblioteka `pg`.
interface PostgresErrorLike {
    code?: string;
    constraint?: string;
}

// Zamienia techniczne bledy PostgreSQL na kontrolowane bledy aplikacji.
// Dzieki temu API nie dostanie surowych komunikatow z bazy danych.
export function mapPostgresError(error: unknown): AppError {
    // Jesli blad nie wyglada jak blad PostgreSQL, traktuje go jak blad wewnetrzny.
    if (!isPostgresError(error)) {
        return AppError.internal();
    }

    // 23505 = unique_violation, chodzi o duplikaty na przyklad.
    if (error.code === '23505') {
        // Warunek rozpoznaje duplikat występu i zwraca komunikat zrozumiały dla klienta.
        if (error.constraint === 'match_appearances_unique_player') {
            return AppError.conflict('Player already has an appearance in this match');
        }

        // Mapper nie dodaje surowego detail z PostgreSQL, ponieważ odpowiedź API nie powinna ujawniać struktury bazy.
        return AppError.conflict('Resource already exists');
    }

    // 23503 = foreign_key_violation, proba usuniecia zasobu, ktory jest powiazany z innym zasobem.
    if (error.code === '23503') {
        return AppError.conflict('Resource is related to another resource');
    }

    // 23514 = check_violation, czyli naruszenie ograniczenia CHECK w bazie danych.
    if (error.code === '23514') {
        return AppError.badRequest('Data violates a business rule');
    }

    return AppError.internal();
}

// Type guard sprawdzajacy, czy `unknown` ma pola typowe dla bledu PostgreSQL.
function isPostgresError(error: unknown): error is PostgresErrorLike {
    return typeof error === 'object' && error !== null && 'code' in error;
}
