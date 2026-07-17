// plik jest potrzebny z uwagi na to że nie używane są żadne frameworki typu express lub nextjs

// Opcje potrzebne do utworzenia kontrolowanego bledu aplikacyjnego.
//
// Potrzebne do utworzenia kontrolowanego bledu aplikacyjnego, zwracany do klienta w formacie JSON API.
export interface AppErrorOptions {
  // Status HTTP, ktory powinien dostac klient.
  statusCode: number;

  // Stabilny kod bledu aplikacji.
  code: string;

  // Czytelny komunikat bledu.
  message: string;

  // Opcjonalne szczegoly.
  details?: unknown;
}

// Wlasna klasa bledu dla backendu.
//
// Dziedziczy po Error, ale dodaje informacje potrzebne API:
// - status HTTP,
// - kod bledu,
// - opcjonalne szczegoly,
// - flage, ze blad jest spodziewany/operacyjny.
export class AppError extends Error {
  // Status HTTP odpowiedzi.
  public readonly statusCode: number;

  // Stabilny kod bledu.
  public readonly code: string;

  // Dodatkowe dane o bledzie (opcjonalne).
  public readonly details?: unknown;

  // Flaga rozrozniajaca blad kontrolowany od niespodziewanej awarii.
  public readonly isOperational = true;

  public constructor(options: AppErrorOptions) {
    // Przekazuje message do bazowej klasy Error.
    super(options.message);

    // Ustawia nazwe klasy bledu widoczna.
    this.name = 'AppError';

    // Przepisuje dane z options do instancji bledu.
    this.statusCode = options.statusCode;
    this.code = options.code;

    // Przy exactOptionalPropertyTypes nie chcemy ustawic details: undefined.
    // Dodajemy pole tylko wtedy, gdy naprawde zostalo podane.
    if (options.details !== undefined) {
      this.details = options.details;
    }

    // Zachowuje czytelny stack trace, zaczynajac od miejsca utworzenia AppError.
    Error.captureStackTrace?.(this, AppError);

    // Pomaga utrzymac poprawne dzialanie `instanceof AppError`
    // po dziedziczeniu z wbudowanej klasy Error.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // Fabryka dla bledu 400 Bad Request.
  // Uzywamy jej, gdy klient wyslal niepoprawne dane.
  public static badRequest(message: string, details?: unknown): AppError {
    return new AppError({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message,
      details,
    });
  }

  // Fabryka dla bledu 404 Not Found.
  // Uzywamy jej, gdy zasob albo trasa nie istnieje.
  public static notFound(message = 'Resource not found'): AppError {
    return new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message,
    });
  }

  // Fabryka dla bledu 409 Conflict.
  // Uzywamy jej, gdy request jest poprawny technicznie,
  // ale koliduje z aktualnym stanem danych, np. duplikat nazwy klubu.
  public static conflict(message = 'Conflict', details?: unknown): AppError {
    return new AppError({
      statusCode: 409,
      code: 'CONFLICT',
      message,
      details,
    });
  }

  // Fabryka dla bledu 405 Method Not Allowed.
  // Uzywamy jej, gdy sciezka istnieje, ale metoda HTTP jest niepoprawna.
  public static methodNotAllowed(message = 'Method not allowed'): AppError {
    return new AppError({
      statusCode: 405,
      code: 'METHOD_NOT_ALLOWED',
      message,
    });
  }

  // Fabryka dla bledu 413 Payload Too Large.
  // Uzywamy jej, gdy request body przekracza ustawiony limit.
  public static payloadTooLarge(message = 'Request body is too large'): AppError {
    return new AppError({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message,
    });
  }

  // Fabryka dla bledu 415 Unsupported Media Type.
  // Uzywamy jej, gdy klient wysle np. text/plain zamiast application/json.
  public static unsupportedMediaType(message = 'Unsupported media type'): AppError {
    return new AppError({
      statusCode: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message,
    });
  }

  // Fabryka dla bledu 500 Internal Server Error.
  // Uzywamy jej, gdy backend napotka nieoczekiwany blad.
  public static internal(message = 'Unexpected server error'): AppError {
    return new AppError({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message,
    });
  }
}
