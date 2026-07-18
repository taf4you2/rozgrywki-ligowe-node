import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { query } from './db/query.js';

// Zwalidowana konfiguracja aplikacji.
import { env } from './config/env.js';

// Router HTTP, ktory dopasowuje metode i sciezke requestu.
import { Router } from './http/router.js';

// Funkcje pomocnicze do wysylania odpowiedzi JSON i bledow w jednolitym formacie.
import { sendError, sendJson } from './http/json.js';

// Tworzy jedna instancje routera dla calej aplikacji.
// Moduly beda rejestrowac tutaj swoje trasy.
const router = new Router();

// Prosty healthcheck bez prefiksu API.
// Taka trasa jest wygodna dla Dockera, load balancera albo szybkiego sprawdzenia lokalnie.
router.get('/health', ({ res }) => {
  sendJson(res, {
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Ten sam healthcheck pod docelowym prefiksem publicznego API.
router.get('/api/v1/health', ({ res }) => {
  sendJson(res, {
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});


// Healthcheck sprawdzajacy polaczenie z baza danych.
router.get('/api/v1/health/database', async ({ res }) => {
  await query('SELECT 1');

  sendJson(res, {
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

// Tworzy serwer HTTP z wbudowanego modulu Node.js.
// Funkcja przekazana do createServer wykona sie dla kazdego przychodzacego requestu.
const server = createServer(async (req, res) => {
  // Kazdy request dostaje identyfikator.
  // Pomaga to laczyc odpowiedz API z logami backendu.
  const requestId = getRequestId(req);

  // Zwraca requestId do klienta, zeby frontend albo narzedzie API moglo go zobaczyc.
  res.setHeader('X-Request-Id', requestId);

  // Ustawia naglowki CORS przed obsluga requestu.
  // Dzieki temu frontend z innego portu moze komunikowac sie z backendem.
  setCorsHeaders(res);

  // Przegladarka moze wyslac request OPTIONS przed wlasciwym requestem, zeby sprawdzic czy CORS pozwala na dana operacje.
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    // Glowna obsluga requestu.
    // Router znajdzie pasujaca trase i uruchomi jej handler.
    await router.handle(req, res, requestId);
  } catch (error) {
    // Kazdy blad z routera albo handlera trafia tutaj.
    // sendError zamieni go na spojna odpowiedz JSON.
    // Stack trace pokazuje tylko poza produkcja.
    sendError(res, error, requestId, env.NODE_ENV !== 'production');
  }
});

// Start serwera na porcie skonfigurowanym w env.ts.
server.listen(env.PORT, () => {
  console.log(`Backend listening on port ${env.PORT}`);
});

// Obsluguje sygnaly zamykania procesu.
// SIGTERM czesto wysyla Docker/system, a SIGINT zwykle pochodzi z Ctrl+C.
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Ustawia naglowki CORS dla kazdej odpowiedzi.
// CORS decyduje, czy przegladarka pozwoli frontendowi wywolac backend z innego originu.
function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Request-Id');
}

// Zwraca identyfikator requestu.
//
// Jesli klient wyslal naglowek X-Request-Id, uzywa go.
// Jesli nie, generuje nowy UUID.
function getRequestId(req: IncomingMessage): string {
  const header = req.headers['x-request-id'];

  if (typeof header === 'string' && header.trim() !== '') {
    return header;
  }

  return randomUUID();
}

// Zamyka serwer w kontrolowany sposob.
//
// server.close przestaje przyjmowac nowe polaczenia i konczy prace, gdy aktywne polaczenia zostana zamkniete.
function shutdown(): void {
  server.close((error) => {
    if (error !== undefined) {
      console.error(error);
      process.exit(1);
    }

    process.exit(0);
  });
}
