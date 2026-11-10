# Plan dzialania backendu

Ten dokument opisuje kolejnosc implementacji backendu dla projektu Rozgrywki Ligowe.
Zrodlem prawdy dla modelu danych jest `database/initial_schema.sql`.

## Zalozenia

- Backend jest pisany w czystym Node.js z TypeScript, bez Expressa, NestJS i ORM.
- Komunikacja z baza odbywa sie przez `pg` i parametryzowane zapytania SQL.
- Publiczne endpointy API uzywaja prefiksu `/api/v1`.
- Schemat bazy zawiera encje: `clubs`, `players`, `matches`, `match_appearances`, `goals`.
- Dokumentacja domenowa moze zostac pozniej dopasowana do istniejacego schematu bazy.
- SQL nie trafia do routerow ani kontrolerow; zapytania sa trzymane w repozytoriach.

## Etap 1: Fundament aplikacji

Cel: uruchomic stabilny szkielet serwera HTTP.

Zakres:

- `server.ts` jako punkt startowy aplikacji.
- `config/env.ts` do ladowania i walidacji zmiennych srodowiskowych.
- `errors/app-error.ts` do wspolnego typu bledow aplikacyjnych.
- `http/json.ts` do czytania JSON, limitu body i odpowiedzi JSON.
- `http/router.ts` jako prosty router metod i sciezek.
- Endpointy techniczne:
  - `GET /health`
  - `GET /api/v1/health`

Efekt koncowy:

- Backend startuje lokalnie.
- Nieznane trasy zwracaja `404`.
- Nieobslugiwane metody zwracaja `405`.
- Bledy maja jeden wspolny format odpowiedzi.

## Etap 2: Warstwa PostgreSQL

Cel: przygotowac bezpieczna komunikacje z baza.

Zakres:

- `db/pool.ts` z pula polaczen `pg`.
- `db/query.ts` jako wspolne miejsce wykonywania zapytan.
- `db/transaction.ts` do operacji wymagajacych transakcji.
- Mapowanie bledow PostgreSQL na bledy HTTP:
  - unikalnosc na `409`,
  - klucze obce na `400` albo `409`,
  - naruszenia `CHECK` na `400`.
- Test polaczenia z baza przez endpoint techniczny albo osobny test integracyjny.

Efekt koncowy:

- Backend potrafi wykonac proste zapytanie do PostgreSQL.
- Bledy bazy nie wyciekaja w surowej formie do klienta.

## Etap 3: Modul klubow

Cel: zrobic pierwszy pelny modul jako wzorzec dla kolejnych.

Endpointy:

- `GET /api/v1/clubs`
- `GET /api/v1/clubs/:id`
- `POST /api/v1/clubs`
- `PUT /api/v1/clubs/:id`
- `DELETE /api/v1/clubs/:id`
- `GET /api/v1/clubs/:id/players`

Warstwy:

- `clubs.controller.ts`
- `clubs.service.ts`
- `clubs.repository.ts`
- `clubs.types.ts`
- `clubs.validation.ts`

Reguly:

- Nazwa klubu jest wymagana.
- Miasto jest wymagane.
- Nazwa klubu musi byc unikalna.
- Usuniecie klubu z zawodnikami albo meczami powinno zwracac kontrolowany blad.

Efekt koncowy:

- CRUD klubow dziala end-to-end.
- Modul pokazuje docelowy styl dla kolejnych zasobow.

## Etap 4: Modul zawodnikow

Cel: obsluzyc zawodnikow i relacje z klubem.

Endpointy:

- `GET /api/v1/players`
- `GET /api/v1/players/:id`
- `POST /api/v1/players`
- `PUT /api/v1/players/:id`
- `DELETE /api/v1/players/:id`
- `PATCH /api/v1/players/:id/transfer`

Filtry:

- `clubId`
- `search`

Reguly:

- Zawodnik musi nalezec do istniejacego klubu.
- Transfer do obecnego klubu jest niedozwolony.
- Usuniecie zawodnika powiazanego z wystepami albo bramkami powinno zwracac kontrolowany blad.

Efekt koncowy:

- Mozna zarzadzac zawodnikami i zmieniac ich klub.

## Etap 5: Modul meczow

Cel: obsluzyc terminarz i wyniki zgodnie z tabela `matches`.

Endpointy:

- `GET /api/v1/matches`
- `GET /api/v1/matches/:id`
- `POST /api/v1/matches`
- `PUT /api/v1/matches/:id`
- `DELETE /api/v1/matches/:id`

Filtry:

- `clubId`
- `from`
- `to`
- `played`

Reguly:

- Gospodarz i gosc musza istniec.
- Gospodarz i gosc musza byc roznymi klubami.
- Wyniki moga byc `null`, gdy mecz nie zostal rozegrany.
- Wyniki nie moga byc ujemne.

Efekt koncowy:

- Mozna tworzyc mecze, przegladac terminarz i zapisywac wyniki.

## Etap 6: Modul wystepow

Cel: obsluzyc sklad, minuty, kartki i faule.

Endpointy:

- `GET /api/v1/matches/:matchId/appearances`
- `POST /api/v1/matches/:matchId/appearances`
- `PUT /api/v1/appearances/:id`
- `DELETE /api/v1/appearances/:id`

Reguly:

- Jeden zawodnik moze miec tylko jeden wystep w danym meczu.
- `minute_in` nie moze byc ujemne.
- `minute_out` moze byc `null`.
- `minute_out` nie moze byc mniejsze niz `minute_in`.
- Kartki i faule nie moga byc ujemne.

Efekt koncowy:

- Szczegoly meczu moga pokazywac liste wystepow zawodnikow.

## Etap 7: Modul bramek

Cel: obsluzyc gole, asysty i gole samobojcze.

Endpointy:

- `GET /api/v1/matches/:matchId/goals`
- `POST /api/v1/matches/:matchId/goals`
- `PUT /api/v1/goals/:id`
- `DELETE /api/v1/goals/:id`

Reguly:

- Mecz musi istniec.
- Strzelec musi istniec.
- Asystujacy, jesli podany, musi istniec.
- Strzelec i asystujacy nie moga byc ta sama osoba.
- Minuta gola nie moze byc ujemna.

Efekt koncowy:

- Szczegoly meczu moga pokazywac bramki i asysty.

## Etap 8: Statystyki

Cel: zbudowac endpointy agregujace dane.

Endpointy:

- `GET /api/v1/stats/top-scorers`
- `GET /api/v1/stats/cards`
- `GET /api/v1/stats/appearances`

Reguly:

- Gole samobojcze nie sa liczone w klasyfikacji strzelcow.
- Endpointy powinny przyjmowac `limit`.
- Filtry po klubie lub zakresie dat mozna dodac po podstawowej wersji.

Efekt koncowy:

- Frontend moze pokazac rankingi zawodnikow.

## Etap 9: Testy

Cel: zabezpieczyc najwazniejsze zachowania backendu.

Zakres:

- Testy jednostkowe:
  - router,
  - parser JSON,
  - walidatory,
  - mapowanie bledow.
- Testy integracyjne:
  - CRUD klubow,
  - CRUD zawodnikow,
  - transfer zawodnika,
  - tworzenie meczu,
  - dodawanie wystepu,
  - dodawanie bramki,
  - statystyki.

Efekt koncowy:

- `npm test`, `npm run typecheck` i `npm run lint` sa podstawowym zestawem kontroli jakosci.

## Etap 10: Dokumentacja API

Cel: opisac kontrakt API dla frontendu.

Zakres:

- Lista endpointow.
- Przyklady requestow.
- Przyklady odpowiedzi sukcesu.
- Przyklady bledow.
- Opis parametrow query.
- Opis kodow HTTP.

Efekt koncowy:

- Frontend moze byc implementowany bez zgadywania ksztaltu odpowiedzi backendu.

## Proponowana kolejnosc pracy

1. Fundament aplikacji.
2. Warstwa PostgreSQL.
3. Kluby jako modul wzorcowy.
4. Zawodnicy i transfer.
5. Mecze.
6. Wystepy.
7. Bramki.
8. Statystyki.
9. Testy integracyjne.
10. Dokumentacja API.

## Kryteria gotowosci backendu MVP

- Serwer startuje lokalnie i w Docker Compose.
- API ma jednolity format bledow.
- Wszystkie zapytania SQL sa parametryzowane.
- Dzialaja CRUD-y dla klubow, zawodnikow i meczow.
- Dziala dodawanie wystepow i bramek.
- Dzialaja podstawowe statystyki.
- Najwazniejsze scenariusze maja testy integracyjne.
