import type { IncomingMessage, ServerResponse } from 'node:http';

import { AppError } from '../errors/app-error.js';

// Lista metod HTTP, ktore nasz router umie obsluzyc.
// Jesli przyjdzie inna metoda router jej nie dopasuje.
// OPTIONS jest obslugiwane w server.ts przed wejsciem do routera.
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Dane przekazywane do handlera konkretnej trasy.
// Handler dostaje request, response oraz wygodnie przygotowane parametry.
export interface RouteContext {
  // Surowy request z Node.js.
  req: IncomingMessage;

  // Surowa odpowiedz z Node.js.
  res: ServerResponse;

  // Parametry sciezki.
  params: Record<string, string>;

  // Parametry query string.
  query: URLSearchParams;

  // Identyfikator requestu ustawiany w server.ts.
  requestId: string;
}

// Typ funkcji, ktora obsluguje trase, synchroniczna lub asynchroniczna
type RouteHandler = (context: RouteContext) => Promise<void> | void;

// Wewnetrzna reprezentacja zarejestrowanej trasy.
interface Route {
  // Metoda HTTP.
  method: HttpMethod;

  // Oryginalna sciezka.
  path: string;

  // Sciezka rozbita na segmenty przyspiesza i upraszcza dopasowanie requestu.
  segments: string[];

  // Funkcja, ktora ma sie wykonac po dopasowaniu trasy.
  handler: RouteHandler;
}

export class Router {
  // Lista wszystkich tras zarejestrowanych w aplikacji.
  private readonly routes: Route[] = [];

  // Rejestruje GET.
  public get(path: string, handler: RouteHandler): void {
    this.add('GET', path, handler);
  }

  // Rejestruje POST.
  public post(path: string, handler: RouteHandler): void {
    this.add('POST', path, handler);
  }

  // Rejestruje PUT.
  public put(path: string, handler: RouteHandler): void {
    this.add('PUT', path, handler);
  }

  // Rejestruje PATCH.
  public patch(path: string, handler: RouteHandler): void {
    this.add('PATCH', path, handler);
  }

  // Rejestruje DELETE.
  public delete(path: string, handler: RouteHandler): void {
    this.add('DELETE', path, handler);
  }

  // Glowne wejscie routera.
  // Dostaje request z server.ts, szuka pasujacej trasy i uruchamia jej handler.
  public async handle(req: IncomingMessage, res: ServerResponse, requestId: string): Promise<void> {
    // req.url moze byc sama sciezka, np. /api/v1/clubs?search=a.
    // Konstruktor URL potrzebuje pelnego adresu, dlatego dodaje sztuczna baze.
    const url = new URL(req.url ?? '/', 'http://localhost');

    // Zamieni metode z req.method na nasz ograniczony typ HttpMethod.
    const method = toHttpMethod(req.method);

    // Jesli metoda nie jest obslugiwana przez router, zwraca blad kontrolowany (405).
    if (method === undefined) {
      throw AppError.methodNotAllowed();
    }

    // Szuka trasy, ktora ma taka sama metode i pasujaca sciezke.
    for (const route of this.routes) {
      // Najpierw metoda. Jesli metoda sie nie zgadza, nie sprawdza sciezki.
      if (route.method !== method) {
        continue;
      }

      // Sprawdza czy sciezka requestu pasuje do wzorca trasy, jesli tak dostaje obiekt params.
      const params = matchSegments(route.segments, url.pathname);

      if (params !== undefined) {
        // Uruchamia handler dopasowanej trasy.
        // Przekazuje mu gotowy kontekst zamiast kazac mu samemu parsowac URL.
        await route.handler({
          req,
          res,
          params,
          query: url.searchParams,
          requestId,
        });
        return;
      }
    }

    // Jesli nie znalezlia trasy dla tej metody, sprawdza jeszcze,
    // czy taka sciezka istnieje dla innej metody.
    // To pozwala odroznic:
    // - 405 Method Not Allowed: sciezka istnieje, metoda zla,
    // - 404 Not Found: sciezka w ogole nie istnieje.
    const pathExists = this.routes.some((route) => matchSegments(route.segments, url.pathname) !== undefined);

    if (pathExists) {
      throw AppError.methodNotAllowed();
    }

    throw AppError.notFound('Route not found');
  }

  // Wspolna metoda uzywana przez get/post/put/patch/delete.
  // Zapisuje trase w tablicy routes.
  private add(method: HttpMethod, path: string, handler: RouteHandler): void {
    this.routes.push({
      method,
      path,
      segments: splitPath(path),
      handler,
    });
  }
}

// Sprawdza, czy metoda z requestu jest jedna z metod obslugiwanych przez router.
// TypeScript dzieki temu wie pozniej, ze `method` to HttpMethod, a nie dowolny string.
function toHttpMethod(method: string | undefined): HttpMethod | undefined {
  if (
    method === 'GET' ||
    method === 'POST' ||
    method === 'PUT' ||
    method === 'PATCH' ||
    method === 'DELETE'
  ) {
    return method;
  }

  return undefined;
}

// Dzieli sciezke na segmenty.
//
// Przyklady:
// "/"                    -> []
// "/health"              -> ["health"]
// "/api/v1/clubs/:id"    -> ["api", "v1", "clubs", ":id"]
function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

// Dopasowuje sciezke requestu do wzorca trasy.
//
// Przyklad:
// routeSegments = ["api", "v1", "clubs", ":id"]
// pathname      = "/api/v1/clubs/12"
// wynik         = { id: "12" }
//
// Jesli sciezka nie pasuje, funkcja zwraca undefined.
function matchSegments(routeSegments: string[], pathname: string): Record<string, string> | undefined {
  const pathSegments = splitPath(pathname);

  // Liczba segmentow musi byc taka sama.
  // /clubs/:id nie pasuje do /clubs ani do /clubs/12/players.
  if (routeSegments.length !== pathSegments.length) {
    return undefined;
  }

  // Tutaj zbiera parametry dynamiczne, np. :id.
  const params: Record<string, string> = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const pathSegment = pathSegments[index];

    // Przy wlaczonym noUncheckedIndexedAccess TypeScript wymaga sprawdzenia,
    // czy wartosc z tablicy na pewno istnieje.
    if (routeSegment === undefined || pathSegment === undefined) {
      return undefined;
    }

    // Segment zaczynajacy sie od ":" jest parametrem.
    // ":id" zapisuje w params jako "id".
    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    // Segment statyczny musi byc identyczny.
    // "clubs" pasuje tylko do "clubs".
    if (routeSegment !== pathSegment) {
      return undefined;
    }
  }

  // Jesli wszystkie segmenty pasuja, zwraca parametry.
  return params;
}
