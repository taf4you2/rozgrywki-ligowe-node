import type { QueryConfig, QueryResult, QueryResultRow } from 'pg';

import { mapPostgresError } from './errors.js';
import { pool } from './pool.js';

// Wspolny helper do wykonywania prostych zapytan SQL.
// Dzieki niemu repozytoria nie musza importowac puli bezposrednio.
export async function query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] = [],
): Promise<QueryResult<Row>> {
    try {
        // Przekazuje parametry osobno, zeby unikac skladania SQL-a z danych uzytkownika.
        return await pool.query<Row>(text, values);
    } catch (error) {
        // Zamienia bledy PostgreSQL na format AppError uzywany przez reszte API.
        throw mapPostgresError(error);
    }
}

// Wariant dla bardziej rozbudowanej konfiguracji zapytania, np. gdy trzeba podac `name`
// dla prepared statement albo skorzystac z obiektu QueryConfig.
export async function queryConfig<Row extends QueryResultRow = QueryResultRow>(
    config: QueryConfig,
): Promise<QueryResult<Row>> {
    try {
        return await pool.query<Row>(config);
    } catch (error) {
        throw mapPostgresError(error);
    }
}
