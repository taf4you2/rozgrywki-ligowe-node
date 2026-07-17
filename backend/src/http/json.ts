import type { IncomingMessage, ServerResponse } from 'node:http';

import { AppError } from '../errors/app-error.js';

// Najprostsze wartosci, ktore moga wystapic w JSON.
export type JsonPrimitive = string | number | boolean | null;

// Rekurencyjny typ JSON.
// Oznacza to ze JSON moze byc:
// - pojedyncza wartoscia,
// - tablica wartosci JSON,
// - obiektem, ktorego pola tez sa wartosciami JSON.
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

// Standardowy ksztalt odpowiedzi bledow w API.
// Frontend moze dzieki temu zawsze czytac blad stalym formacie.
export interface ErrorResponse {
  error: {
    // HTTP status.
    status: number;

    // Stabilny kod bledu dla aplikacji.
    code: string;

    // Opis bledu.
    message: string;

    // Identyfikator requestu.
    requestId: string;

    // Moment utworzenia odpowiedzi bledu.
    timestamp: string;

    // Opcjonalne dodatkowe informacje.
    details?: unknown;

    stack?: string;
  };
}

// Czyta body requestu i probuje sparsowac je jako JSON.
//
// Node nie ma tego wbudowanego (uzywa strumieni), wiec trzeba:
// - sprawdzic Content-Type,
// - zebrac fragmenty body,
// - pilnowac limitu rozmiaru,
// - zlozyc buffer,
// - wykonac parsowanie.
export async function readJsonBody(req: IncomingMessage, limitBytes: number): Promise<unknown> {
  // Akceptuje tylko application/json.
  ensureJsonContentType(req);

  // Request moze przychodzic w wielu ramkach, wiec trzyma je w tablicy.
  const chunks: Buffer[] = [];

  // Licznik bajtow potrzebny do egzekwowania limitu body.
  let receivedBytes = 0;

  // Iteruje po strumieniu requestu.
  // Kazda chunk to kolejny fragment body.
  for await (const chunk of req) {
    // Chunk moze byc stringiem albo Bufferem.
    // Do dalszej pracy wszystko normalizowane jest do Buffera.
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    receivedBytes += buffer.byteLength;

    // Jesli klient wysle za duzo danych nastepuje przerwanie.
    if (receivedBytes > limitBytes) {
      throw AppError.payloadTooLarge();
    }

    chunks.push(buffer);
  }

  // Brak body traktowany jako null.
  if (chunks.length === 0) {
    return null;
  }

  // Laczy wszystkie fragmenty w jeden Buffer i zamienia na tekst UTF-8.
  const rawBody = Buffer.concat(chunks).toString('utf8');

  // Body skladajace sie tylko ze spacji tez traktuje jako brak danych.
  if (rawBody.trim() === '') {
    return null;
  }

  try {
    // JSON.parse moze rzucic blad, jesli body nie jest poprawnym JSON-em.
    return JSON.parse(rawBody);
  } catch {
    // Nie zwraca surowego bledu JSON.parse, tylko kontrolowany blad API.
    throw AppError.badRequest('Request body must be valid JSON');
  }
}

// Wysyla odpowiedz JSON.
//
// Ta funkcja centralizuje ustawianie:
// - statusu HTTP,
// - Content-Type,
// - Content-Length,
// - zakonczenia odpowiedzi.
export function sendJson(res: ServerResponse, data: JsonValue, statusCode = 200): void {
  // Zamienia dane JS na tekst JSON.
  const body = JSON.stringify(data);

  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

// Wysyla odpowiedz 204 No Content.
// Uzyteczne np. po poprawnym DELETE.
export function sendNoContent(res: ServerResponse): void {
  res.statusCode = 204;
  res.end();
}

// Wysyla blad w jednolitym formacie JSON.
//
// Przyjmuje `unknown`, bo w JavaScript/TypeScript rzucic mozna praktycznie wszystko:
// Error, string, obiekt albo cokolwiek innego.
export function sendError(
  res: ServerResponse,
  error: unknown,
  requestId: string,
  includeStack = false,
): void {
  // Zamienia dowolny blad na AppError.
  const appError = normalizeError(error);

  // Buduje standardowa odpowiedz bledu.
  const response: ErrorResponse = {
    error: {
      status: appError.statusCode,
      code: appError.code,
      message: appError.message,
      requestId,
      timestamp: new Date().toISOString(),
      ...(appError.details === undefined ? {} : { details: appError.details }),
      ...(includeStack && appError.stack !== undefined ? { stack: appError.stack } : {}),
    },
  };

  // ErrorResponse zawiera pola `unknown`, a JsonValue jest bardziej restrykcyjny.
  // Rzutowanie ten obiekt i tak bedzie serializowany przez JSON.stringify.
  sendJson(res, response as unknown as JsonValue, appError.statusCode);
}

// Sprawdza, czy request ma naglowek Content-Type: application/json.
//
// Dopuszcza tez wariant z parametrami, np.:
// application/json; charset=utf-8
function ensureJsonContentType(req: IncomingMessage): void {
  const contentTypeHeader = req.headers['content-type'];

  // Naglowek moze byc stringiem albo tablica stringow.
  // Do sprawdzenia bierze pierwsza wartosc.
  const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;

  if (contentType === undefined) {
    throw AppError.unsupportedMediaType('Content-Type header is required');
  }

  // Odcina parametry po sredniku.
  // Z "application/json; charset=utf-8" zostanie "application/json".
  const mediaType = contentType.split(';')[0]?.trim().toLowerCase();

  if (mediaType !== 'application/json') {
    throw AppError.unsupportedMediaType('Content-Type must be application/json');
  }
}

// Zamienia dowolny blad na AppError.
//
// Jesli blad jest juz AppError, zachowuje jego status, kod i komunikat.
// Jesli to nieznany blad, ukrywa szczegoly i zwraca neutralne 500.
function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  return AppError.internal();
}
