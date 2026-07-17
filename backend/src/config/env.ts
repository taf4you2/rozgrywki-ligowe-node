import 'dotenv/config';

// NodeEnv okresla tryb pracy aplikacji.
// uzyto unii zamiast zwyklego stringa, zeby runtime pilnowal tylko tych wartosci, ktore backend rzeczywiscie obsluguje.
type NodeEnv = 'development' | 'test' | 'production';

// LOG_LEVEL tez ograniczamy do znanych wartosci.
// zeby uproscic dzialanie loggera i uniknac literowek w zmiennej srodowiskowej
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Env opisuje gotowa, zwalidowana konfiguracje aplikacji.
// Reszta kodu powinna korzystac z tego interfejsu przez eksportowany obiekt `env`,
// zamiast czytac bezposrednio z process.env.
export interface Env {
  // Tryb uruchomienia aplikacji: lokalny, testowy albo produkcyjny.
  NODE_ENV: NodeEnv;

  // Port, na ktorym serwer HTTP bedzie nasluchiwal.
  PORT: number;

  // Adres glownej bazy PostgreSQL.
  DATABASE_URL: string;

  // Adres testowej bazy PostgreSQL.
  // Jest opcjonalny, bo nie kazde uruchomienie aplikacji odpala testy.
  TEST_DATABASE_URL?: string;

  // Origin frontendu, ktory dostanie dostep przez CORS.
  CORS_ORIGIN: string;

  // Maksymalny rozmiar JSON body w bajtach.
  BODY_LIMIT_BYTES: number;

  // Poziom szczegolowosci logow.
  LOG_LEVEL: LogLevel;
}

// Czyta opcjonalna zmienna srodowiskowa.
//
// process.env przechowuje wszystko jako string albo undefined.
// Ta funkcja dodatkowo:
// - usuwa spacje z poczatku i konca,
// - traktuje pusty string jak brak wartosci.

function readOptional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === '' ? undefined : value;
}

// Czyta wymagana zmienna srodowiskowa.
//
// Jesli wartosci nie ma, rzuca zwykly Error podczas startu aplikacji.
// Celowe zachowanie: brak kluczowej konfiguracji zatrzymuje backend od razu, zamiast powodowac trudniejszy blad dopiero przy pierwszym requescie.
function readRequired(name: string): string {
  const value = readOptional(name);

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

// Czyta dodatnia liczbe calkowita ze zmiennej srodowiskowej.
//
// Uzywamy tego dla wartosci takich jak PORT i BODY_LIMIT_BYTES.
// Jesli zmienna nie istnieje, funkcja zwraca podana wartosc domyslna.
// Jesli istnieje, ale nie jest dodatnia liczba calkowita, start aplikacji konczy sie bledem.
function readNumber(name: string, defaultValue: number): number {
  const rawValue = readOptional(name);

  if (rawValue === undefined) {
    return defaultValue;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }

  return value;
}

// Czyta i waliduje NodeENV.
//
// Domyslnie przyjmujemy "development", bo to najbezpieczniejszy tryb lokalny.
// Nie zwracamy dowolnego stringa, tylko konkretny typ NodeEnv.
function readNodeEnv(): NodeEnv {
  const value = readOptional('NODE_ENV') ?? 'development';

  if (value === 'development' || value === 'test' || value === 'production') {
    return value;
  }

  throw new Error('NODE_ENV must be one of: development, test, production');
}

// Czyta i waliduje LOG_LEVEL.
//
// Domyslnie uzywamy "info", czyli umiarkowanego poziomu logow:
// mniej szczegolowego niz debug, ale nadal przydatnego podczas normalnej pracy.
function readLogLevel(): LogLevel {
  const value = readOptional('LOG_LEVEL') ?? 'info';

  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }

  throw new Error('LOG_LEVEL must be one of: debug, info, warn, error');
}

// TEST_DATABASE_URL czytamy osobno, bo jest opcjonalny.
// Przy wlaczonej opcji exactOptionalPropertyTypes nie chcemy wpisywac:
// TEST_DATABASE_URL: undefined
// tylko calkowicie pominac to pole, jesli zmienna nie istnieje.
const testDatabaseUrl = readOptional('TEST_DATABASE_URL');

// Finalny zwalidowany obiekt konfiguracyjny.
//
// Importujac `env` w innych plikach, mamy pewnosc, ze:
// - wymagane wartosci istnieja,
// - liczby sa juz liczbami,
// - NODE_ENV i LOG_LEVEL maja tylko dozwolone wartosci,
// - domyslne wartosci zostaly uzupelnione.
export const env: Env = {
  NODE_ENV: readNodeEnv(),
  PORT: readNumber('PORT', 3000),
  DATABASE_URL: readRequired('DATABASE_URL'),

  // Jesli testDatabaseUrl istnieje, rozkladamy obiekt z tym polem.
  // Jesli nie istnieje, rozkladamy pusty obiekt i pole nie trafia do env.
  ...(testDatabaseUrl === undefined ? {} : { TEST_DATABASE_URL: testDatabaseUrl }),

  CORS_ORIGIN: readOptional('CORS_ORIGIN') ?? 'http://localhost:4200',
  BODY_LIMIT_BYTES: readNumber('BODY_LIMIT_BYTES', 1_048_576),
  LOG_LEVEL: readLogLevel(),
};
