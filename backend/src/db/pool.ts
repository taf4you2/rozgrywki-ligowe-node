import pg from 'pg';

import { env } from '../config/env.js';

// `pg` jest biblioteka CommonJS, przy NodeNext wyciaga Pool z domyslnego importu.
const { Pool } = pg;

// Jedna wspolna pula polaczen dla calej aplikacji.
// Udostepnia polaczenia posrednio przez `query.ts` albo `transaction.ts`.
export const pool = new Pool({
    connectionString: env.DATABASE_URL,
});

// Ten event dotyczy bledow na bezczynnych klientach w puli.
// Nie obsluguje pojedynczych zapytan; te mapuje w `query.ts` i `transaction.ts`.
pool.on('error', (error) => {
    console.error('Unexpected error on idle client', error);
});
