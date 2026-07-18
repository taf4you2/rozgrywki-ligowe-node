import type { PoolClient, QueryResultRow } from 'pg';

import { mapPostgresError } from './errors.js';
import { pool } from './pool.js';

// Minimalny typ klienta transakcyjnego.
// Wystawia tylko zapytania, zeby kod domenowy nie zarzadzal recznie polaczeniem.
export type TransactionClient = Pick<PoolClient, 'query'>;

// Uruchamia callback wewnatrz transakcji PostgreSQL.
// Jesli wszystkie operacje sie udadza, wykonuje COMMIT.
// Jesli ktorakolwiek rzuci blad, wykonuje ROLLBACK i mapuje blad na AppError.
export async function transaction<Result>(callback: (client: TransactionClient) => Promise<Result>): Promise<Result> {
    // Na czas transakcji pobiera jednego klienta z puli.
    // Wazne jest to zeby ROLLBACK COMMIT BEGIN byly wykonywane na tym samym polaczeniu.
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await callback(client);

        await client.query('COMMIT');

        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');

        throw mapPostgresError(error);
    }
    finally {
        // Klient zawsze wraca do puli, niezaleznie od sukcesu albo bledu.
        client.release();
    }
}

// Helper do wykonywania zapytan na kliencie transakcyjnym.
// Przyda sie, gdy repozytorium ma dzialac zarowno poza transakcja, jak i w transakcji.
export async function transactionQuery<Row extends QueryResultRow = QueryResultRow>(
    client: TransactionClient,
    text: string,
    values: unknown[] = [],
    ) {
    return client.query<Row>(text, values);
}
