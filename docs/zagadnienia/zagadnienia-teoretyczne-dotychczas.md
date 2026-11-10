# Zagadnienia teoretyczne wykorzystane w projekcie

## Cel dokumentu

Ten dokument zbiera zagadnienia wykorzystane w projekcie **Rozgrywki Ligowe** do chwili ukończenia fundamentu HTTP i warstwy komunikacji z PostgreSQL. Materiał jest podzielony na etapy prac, a w ramach etapów na konkretne pliki.

Dokument opisuje stan faktycznie obecny w repozytorium. Moduł klubów jest kolejnym planowanym etapem, ale nie jest tutaj przedstawiany jako już zaimplementowany.

## Aktualny stan projektu

Zrealizowane elementy:

1. Konfiguracja projektu Node.js i TypeScript.
2. Konteneryzacja backendu i PostgreSQL.
3. Relacyjny schemat bazy i dane startowe.
4. Serwer HTTP napisany bez frameworka.
5. Własny router HTTP.
6. Odczytywanie i wysyłanie JSON.
7. Wspólny format błędów API.
8. Konfiguracja CORS i identyfikatorów żądań.
9. Pula połączeń PostgreSQL.
10. Parametryzowane wykonywanie zapytań.
11. Mapowanie błędów PostgreSQL na błędy aplikacji.
12. Obsługa transakcji.
13. Healthcheck aplikacji i połączenia z bazą.

Kolejnym niezrealizowanym jeszcze etapem jest moduł klubów.

---

# Etap 0. Planowanie architektury

## `docs/backend-plan.md`

### Przeznaczenie pliku

Plik określa kolejność budowania backendu oraz odpowiedzialność kolejnych modułów. Jest mapą prac, a nie częścią wykonywaną przez aplikację.

### Zagadnienia

#### Architektura warstwowa

Plan zakłada podział modułów domenowych na:

- kontroler — obsługa protokołu HTTP,
- serwis — reguły biznesowe,
- repozytorium — komunikacja z bazą i SQL,
- typy — opis danych,
- walidację — kontrola danych wejściowych.

Taki podział ogranicza mieszanie odpowiedzialności. SQL nie powinien znajdować się w routerze lub kontrolerze, a repozytorium nie powinno ustawiać statusów HTTP.

#### REST API

API jest projektowane wokół zasobów, takich jak kluby, zawodnicy i mecze. Metody HTTP wyrażają rodzaj operacji:

- `GET` — pobieranie,
- `POST` — tworzenie,
- `PUT` — pełna aktualizacja,
- `PATCH` — częściowa aktualizacja albo wyraźna operacja biznesowa,
- `DELETE` — usuwanie.

Publiczne endpointy otrzymują wersjonowany prefiks `/api/v1`. Wersjonowanie pozwala w przyszłości rozwijać kontrakt API bez natychmiastowego łamania starszych klientów.

#### CRUD

CRUD jest skrótem od:

- Create — utworzenie,
- Read — odczyt,
- Update — aktualizacja,
- Delete — usunięcie.

CRUD opisuje podstawowy zestaw operacji wykonywanych na zasobie.

#### Reguły biznesowe i ograniczenia bazy

Plan rozróżnia reguły sprawdzane przez aplikację od ograniczeń egzekwowanych przez PostgreSQL. Aplikacja odpowiada za czytelny komunikat, a baza jest ostateczną ochroną spójności danych.

#### Rozwój iteracyjny

Projekt jest budowany etapami. Najpierw powstają elementy wspólne, następnie jeden kompletny moduł wzorcowy, a dopiero później następne zasoby. Zmniejsza to koszt powtarzania złych decyzji architektonicznych.

## `docs/Rozgrywki_Ligowe_Plan_markitdown/Rozgrywki_Ligowe_Plan.md`

## `docs/Rozgrywki_Ligowe_Plan.pdf`

## `docs/Plan_realizacji_Rozgrywki_Ligowe_Node_Angular_PostgreSQL.docx`

### Przeznaczenie plików

Są to różne reprezentacje szerszego planu projektu. Opisują zakres całej aplikacji: backend, bazę, przyszły frontend Angular, testy, dokumentację API i automatyzację jakości.

### Zagadnienia

- architektura klient–serwer,
- rozdzielenie frontendu, backendu i bazy,
- REST jako granica komunikacji,
- PostgreSQL jako trwałe źródło danych,
- Docker Compose jako spójne środowisko lokalne,
- planowanie modułów domenowych,
- projektowanie kontraktu API przed budową frontendu,
- automatyczne kontrole jakości i testy.

Ważną zasadą jest to, że frontend nie łączy się bezpośrednio z PostgreSQL. Każda operacja przechodzi przez backend, który kontroluje walidację, uprawnienia, reguły biznesowe i format odpowiedzi.

## `docs/database/database.png`

### Przeznaczenie pliku

Graficzna reprezentacja modelu danych pomaga zrozumieć encje i relacje bez analizowania całego SQL-a.

### Zagadnienia

- diagram bazy danych,
- encje,
- klucze główne,
- klucze obce,
- relacje jeden-do-wielu,
- zależności między tabelami.

---

# Etap 1. Konfiguracja backendu i narzędzi

## `backend/package.json`

### Przeznaczenie pliku

Manifest projektu Node.js opisuje nazwę pakietu, sposób uruchamiania, skrypty oraz zależności produkcyjne i deweloperskie.

### Zagadnienia

#### npm i skrypty

Skrypty zapewniają wspólne polecenia dla typowych czynności:

- uruchomienie serwera w trybie obserwowania zmian,
- zbudowanie JavaScriptu z TypeScriptu,
- sprawdzenie typów bez tworzenia plików wynikowych,
- uruchomienie lintowania,
- formatowanie,
- uruchomienie testów,
- uruchomienie wersji zbudowanej w katalogu `dist`.

#### Zależności produkcyjne i deweloperskie

Zależności produkcyjne są potrzebne działającej aplikacji:

- `dotenv` — ładowanie zmiennych z pliku `.env`,
- `pg` — klient PostgreSQL dla Node.js.

Zależności deweloperskie wspierają tworzenie projektu:

- TypeScript i typy bibliotek,
- `tsx` do bezpośredniego uruchamiania TypeScriptu podczas pracy,
- ESLint do analizy statycznej,
- Prettier do formatowania.

#### ECMAScript Modules

Pole `type` ustawione na `module` powoduje, że Node.js traktuje pliki JavaScript jako moduły ESM. Projekt używa składni `import` i `export`, a nie CommonJS z `require` i `module.exports`.

## `backend/package-lock.json`

### Przeznaczenie pliku

Lockfile zapisuje dokładne wersje całego drzewa zależności, ich źródła i sumy integralności.

### Zagadnienia

- powtarzalne instalacje,
- zależności bezpośrednie i przechodnie,
- kontrola integralności pobieranych pakietów,
- różnica między zakresem wersji w `package.json` a konkretną wersją w lockfile,
- `npm ci` jako instalacja zgodna z lockfile.

Plik jest generowany automatycznie i zwykle nie powinien być ręcznie edytowany.

## `backend/tsconfig.json`

### Przeznaczenie pliku

Konfiguracja kompilatora określa sposób sprawdzania i budowania TypeScriptu.

### Zagadnienia

#### Kompilacja

- `rootDir` wskazuje źródła,
- `outDir` wskazuje wynik kompilacji,
- `target` określa docelowy standard JavaScript,
- `sourceMap` pozwala powiązać wykonujący się JavaScript z TypeScriptem.

#### NodeNext

Tryby modułów i rozwiązywania importów `NodeNext` dostosowują TypeScript do reguł modułów współczesnego Node.js. Z tego powodu lokalne importy w TypeScript mają rozszerzenie `.js`: po kompilacji rzeczywiście wskazują pliki JavaScript.

#### Tryb ścisły

`strict` włącza zestaw rygorystycznych kontroli typów. Dodatkowe ustawienia wymagają między innymi:

- sprawdzania, czy element pobrany z tablicy istnieje,
- rozróżnienia nieobecnego pola opcjonalnego od pola ustawionego na `undefined`,
- zwracania wartości we wszystkich wymaganych gałęziach funkcji,
- usuwania nieużywanych symboli i parametrów,
- unikania niejawnego przechodzenia między przypadkami `switch`.

#### Izolowane moduły i importy typów

Każdy plik musi dać się poprawnie przetworzyć jako samodzielny moduł. `verbatimModuleSyntax` wymusza świadome rozróżnianie importów wartości od importów używanych wyłącznie jako typy.

## `backend/eslint.config.mjs`

### Przeznaczenie pliku

Konfiguracja ESLint opisuje pliki podlegające analizie i aktywne reguły.

### Zagadnienia

- płaska konfiguracja ESLint,
- ignorowanie zależności i plików wynikowych,
- analiza modułów JavaScript,
- wykrywanie nieużywanych zmiennych,
- podział odpowiedzialności między ESLint i TypeScript.

W aktualnej konfiguracji ESLint analizuje pliki JavaScript i pliki konfiguracyjne, a kontrola TypeScriptu odbywa się przez kompilator uruchamiany w skrypcie `lint`.

## `backend/.env.example`

### Przeznaczenie pliku

Plik dokumentuje zmienne środowiskowe potrzebne aplikacji bez przechowywania prawdziwych sekretów.

### Zagadnienia

- konfiguracja zależna od środowiska,
- oddzielenie konfiguracji od kodu,
- adres połączenia PostgreSQL,
- osobna baza testowa,
- port serwera,
- dozwolony origin frontendu,
- limit body,
- poziom logowania.

Plik przykładowy może trafić do repozytorium. Rzeczywisty `.env`, szczególnie z hasłami produkcyjnymi, nie powinien być publikowany.

## `backend/src/config/env.ts`

### Przeznaczenie pliku

Moduł centralnie odczytuje, normalizuje i waliduje konfigurację uruchomieniową.

### Zagadnienia TypeScript

#### Unie literałów

Typy środowiska i poziomu logowania dopuszczają tylko zdefiniowane napisy. Zapobiega to literówkom i wymusza obsługę znanego zbioru wartości.

#### Interfejs

Interfejs opisuje gotową konfigurację używaną przez resztę aplikacji. Dzięki temu inne moduły nie muszą samodzielnie interpretować `process.env`.

#### Pola opcjonalne

Adres bazy testowej jest opcjonalny. Przy rygorystycznej konfiguracji TypeScriptu pole jest pomijane, gdy nie ma wartości, zamiast być jawnie ustawiane na `undefined`.

#### Optional chaining i nullish coalescing

Bezpieczny dostęp do potencjalnie nieistniejącej wartości oraz wybieranie wartości domyślnej pozwalają czytelnie obsługiwać brak zmiennej.

### Zagadnienia konfiguracyjne

#### Fail fast

Brak wymaganej konfiguracji zatrzymuje aplikację podczas startu. Jest to bezpieczniejsze niż dopuszczenie startu i przypadkowa awaria przy pierwszym żądaniu.

#### Walidacja czasu wykonania

TypeScript nie sprawdza danych pochodzących z systemu operacyjnego. `process.env` zawiera napisy albo brak wartości, dlatego konfiguracja musi być sprawdzona również podczas działania programu.

#### Normalizacja

Usuwanie zewnętrznych spacji oraz traktowanie pustego napisu jako braku wartości upraszcza dalszą pracę z konfiguracją.

#### Parsowanie liczb

Port i limit body są konwertowane z tekstu na dodatnie liczby całkowite. Sama adnotacja typu nie wykona takiej konwersji.

## `backend/Dockerfile`

### Przeznaczenie pliku

Dockerfile opisuje obraz backendu.

### Zagadnienia

- obraz bazowy Node.js na Alpine Linux,
- katalog roboczy kontenera,
- kopiowanie manifestów przed kodem dla lepszego cache warstw,
- deterministyczna instalacja przez `npm ci`,
- kopiowanie źródeł,
- dokumentowanie portu aplikacji,
- domyślne polecenie kontenera.

Obraz jest przepisem, a kontener jest uruchomioną instancją obrazu.

---

# Etap 2. PostgreSQL i model danych

## `database/Dockerfile`

### Przeznaczenie pliku

Plik buduje obraz PostgreSQL zawierający skrypty inicjalizujące schemat i dane startowe.

### Zagadnienia

- rozszerzanie oficjalnego obrazu PostgreSQL,
- katalog inicjalizacyjny obrazu,
- kolejność skryptów wynikająca z nazw plików,
- automatyczne uruchomienie SQL podczas tworzenia pustej bazy.

Skrypty w katalogu inicjalizacyjnym są wykonywane przy pierwszym tworzeniu katalogu danych. Ponowne uruchomienie kontenera z istniejącym wolumenem nie inicjalizuje bazy od początku.

## `database/initial_schema.sql`

### Przeznaczenie pliku

Plik tworzy relacyjny schemat danych i jego ograniczenia.

### Transakcja inicjalizacyjna

Cały schemat jest otoczony przez `BEGIN` i `COMMIT`. Dzięki temu operacje stanowią jedną logiczną całość. Jeżeli inicjalizacja zakończy się błędem, nie powinien pozostać częściowo zbudowany schemat.

### DDL

Polecenia tworzące tabele, ograniczenia i indeksy należą do Data Definition Language, czyli części SQL służącej do definiowania struktury danych.

### Migracje schematu

Tabela `schema_migrations` zapisuje identyfikatory zastosowanych zmian schematu. Jest podstawą mechanizmu migracji, w którym każda zmiana bazy otrzymuje własną tożsamość i jest wykonywana kontrolowanie.

### Typy danych

- `integer` — liczby całkowite,
- `varchar(n)` — tekst o ograniczonej długości,
- `boolean` — prawda lub fałsz,
- `timestamptz` — moment w czasie uwzględniający strefę czasową,
- `text` — tekst bez wskazanego limitu długości.

### Klucze główne i identity

Każda główna encja posiada klucz `id`. `GENERATED ALWAYS AS IDENTITY` zleca PostgreSQL generowanie kolejnych identyfikatorów i nie wymaga ręcznego podawania ID przy tworzeniu rekordu.

Klucz główny:

- jednoznacznie identyfikuje rekord,
- nie dopuszcza wartości `NULL`,
- jest unikalny,
- jest automatycznie wspierany indeksem.

### Klucze obce

Klucze obce tworzą relacje i nie pozwalają wskazać nieistniejącego rekordu:

- zawodnik wskazuje klub,
- mecz wskazuje gospodarza i gościa,
- występ wskazuje mecz i zawodnika,
- gol wskazuje mecz, strzelca i opcjonalnego asystenta.

### Polityki usuwania

`ON DELETE RESTRICT` blokuje usunięcie rekordu używanego przez inne dane. Chroni to na przykład zawodnika posiadającego występy lub klub posiadający zawodników.

`ON DELETE CASCADE` usuwa rekordy zależne razem z rekordem nadrzędnym. Usunięcie meczu usuwa jego występy i gole.

Dobór polityki usuwania jest decyzją biznesową, a nie tylko techniczną.

### Ograniczenia integralności

#### `NOT NULL`

Wymaga obecności wartości. Nie zabrania jednak pustego tekstu, dlatego walidacja tekstu nadal należy do aplikacji lub dodatkowego ograniczenia `CHECK`.

#### `UNIQUE`

Chroni unikalność nazwy klubu oraz pary mecz–zawodnik w występach. Ograniczenie wielokolumnowe oznacza, że ten sam zawodnik może wystąpić w wielu meczach, ale tylko raz w konkretnym meczu.

#### `CHECK`

Ograniczenia sprawdzają reguły dotyczące pojedynczego rekordu:

- gospodarz i gość muszą być różni,
- wyniki nie mogą być ujemne,
- minuta wejścia nie może być ujemna,
- minuta zejścia nie może poprzedzać wejścia,
- kartki i faule nie mogą być ujemne,
- minuta gola nie może być ujemna,
- strzelec i asystent nie mogą być tą samą osobą.

#### `DEFAULT`

Wartości domyślne zmniejszają liczbę danych wymaganych podczas tworzenia rekordu. Są używane między innymi dla timestampów, liczników, flagi gola samobójczego i minuty wejścia.

### Wartości `NULL`

`NULL` oznacza brak znanej lub mającej zastosowanie wartości, a nie zero. W projekcie może oznaczać między innymi:

- brak wyniku przed rozegraniem meczu,
- brak minuty zejścia,
- brak asystenta.

Logika SQL dotycząca `NULL` jest trójwartościowa. Porównanie przez zwykły operator równości nie zachowuje się tak samo jak porównanie dwóch zwykłych wartości.

### Indeksy

Indeksy przyspieszają wyszukiwanie, filtrowanie i łączenie po często używanych kolumnach. Projekt dodaje je między innymi do kluczy obcych, daty meczu i nazwiska zawodnika.

Indeks zajmuje miejsce i zwiększa koszt zapisu, dlatego powinien odpowiadać rzeczywistym sposobom odczytu danych.

### Model relacyjny

Najważniejsze relacje:

- klub ma wielu zawodników,
- klub uczestniczy w wielu meczach,
- mecz ma wiele występów,
- zawodnik ma wiele występów,
- mecz ma wiele goli,
- zawodnik może być strzelcem lub asystentem wielu goli.

Tabela `match_appearances` realizuje relację wiele-do-wielu między meczami i zawodnikami oraz przechowuje dodatkowe dane tej relacji.

## `database/test_data.sql`

### Przeznaczenie pliku

Plik dodaje dane startowe pozwalające ręcznie sprawdzić relacje, zapytania i przyszłe endpointy.

### Zagadnienia SQL

#### DML

`INSERT` należy do Data Manipulation Language, czyli części SQL odpowiedzialnej za operowanie na danych.

#### Wielowierszowy `VALUES`

Jedno polecenie może opisać wiele rekordów. Ogranicza to powtarzanie identycznej struktury zapytania.

#### `INSERT ... SELECT`

Dane zależne od innych tabel są wstawiane na podstawie wyniku zapytania. Pozwala to używać czytelnych nazw w seedzie, a następnie odnaleźć odpowiadające im identyfikatory.

#### Aliasowanie

Aliasy tabel i tymczasowych zbiorów upraszczają dłuższe zapytania i rozróżniają wielokrotne użycie tej samej tabeli, na przykład klubu gospodarza i klubu gościa.

#### `JOIN`

Złączenia wewnętrzne wymagają odnalezienia pasujących rekordów po obu stronach. Są używane do pobrania identyfikatorów klubów, meczów i zawodników.

#### `LEFT JOIN`

Złączenie lewe zachowuje rekord główny również wtedy, gdy opcjonalny rekord nie istnieje. Jest potrzebne dla opcjonalnego asystenta gola.

#### Rzutowanie typów

Jawne przekształcenie tekstu na `timestamptz` mówi PostgreSQL, jak interpretować datę znajdującą się w tymczasowym zbiorze wartości.

#### `ON CONFLICT`

Pozwala bezpiecznie pominąć rekord, który koliduje z określonym ograniczeniem unikalności. Jest używane tam, gdzie istnieje odpowiednie ograniczenie bazy.

#### `NOT EXISTS`

Warunek sprawdza, czy odpowiadający rekord jeszcze nie istnieje. Jest wykorzystywany, kiedy nie ma pojedynczego ograniczenia `UNIQUE`, na którym można oprzeć `ON CONFLICT`.

#### `IS NOT DISTINCT FROM`

Operator porównuje wartości w sposób uwzględniający `NULL`. Dwie wartości `NULL` są w tym porównaniu traktowane jako równoważne, co jest przydatne podczas wykrywania istniejącego gola bez asystenta.

### Idempotencja danych startowych

Seed próbuje unikać duplikatów przy kolejnym wykonaniu. Idempotentna operacja prowadzi do tego samego stanu niezależnie od tego, czy zostanie wykonana raz, czy ponownie.

## `docker-compose.yml`

### Przeznaczenie pliku

Docker Compose opisuje wspólne uruchomienie backendu i bazy.

### Zagadnienia

#### Usługi

Każda usługa ma własny obraz, konfigurację, sieć i cykl życia. Backend oraz PostgreSQL pozostają osobnymi procesami i kontenerami.

#### Sieć Compose

Kontenery komunikują się przez nazwę usługi. Dlatego backend używa hosta `postgres`, a nie `localhost`. W kontenerze `localhost` oznacza ten sam kontener.

#### Mapowanie portów

Mapowanie łączy port hosta z portem kontenera. PostgreSQL jest dostępny z hosta na porcie `5433`, natomiast wewnątrz sieci Compose nadal działa na `5432`.

#### Zmienne środowiskowe

Compose dostarcza konfigurację procesom bez zapisywania jej bezpośrednio w kodzie.

#### Wolumen nazwany

Wolumen `postgres-data` przechowuje dane bazy niezależnie od życia pojedynczego kontenera. Usunięcie i odtworzenie kontenera nie musi oznaczać utraty danych.

#### Bind mount

Katalog backendu z hosta jest montowany w kontenerze. Zmiany źródeł są natychmiast widoczne przez proces deweloperski.

#### Anonimowy wolumen `node_modules`

Osobne montowanie katalogu zależności chroni pakiety zainstalowane w kontenerze przed przesłonięciem przez katalog projektu z hosta.

#### Healthcheck

Healthcheck PostgreSQL sprawdza rzeczywistą gotowość bazy. Sam fakt uruchomienia procesu nie oznacza jeszcze, że baza przyjmuje połączenia.

#### Zależność od gotowości

Backend jest uruchamiany po pozytywnym healthchecku bazy. Ogranicza to błędy wynikające z wyścigu podczas startu środowiska.

---

# Etap 3. Fundament HTTP bez frameworka

## `backend/src/errors/app-error.ts`

### Przeznaczenie pliku

Plik definiuje wspólny, kontrolowany typ błędu aplikacyjnego.

### Zagadnienia

#### Dziedziczenie

`AppError` rozszerza wbudowaną klasę `Error`. Zachowuje standardowy komunikat i stack trace, a jednocześnie dodaje dane potrzebne warstwie HTTP.

#### Błąd operacyjny

Błąd operacyjny opisuje spodziewaną sytuację, taką jak zły input, brak zasobu lub konflikt. Różni się od nieoczekiwanej awarii programistycznej albo infrastrukturalnej.

#### Stabilny kod błędu

Status HTTP opisuje kategorię protokołu, natomiast kod aplikacyjny pozwala klientowi rozpoznać konkretny rodzaj błędu bez analizowania tekstu komunikatu.

#### Metody fabrykujące

Statyczne metody tworzą poprawnie skonfigurowane błędy dla typowych statusów. Centralizacja zmniejsza ryzyko użycia różnych kodów i komunikatów w kolejnych modułach.

#### `unknown`

Opcjonalne szczegóły mają typ `unknown`, ponieważ warstwa błędów nie zakłada ich konkretnego kształtu. `unknown` wymaga sprawdzenia wartości przed wykonaniem na niej operacji i jest bezpieczniejsze od `any`.

#### Statusy HTTP

- `400 Bad Request` — niepoprawne dane,
- `404 Not Found` — brak zasobu lub trasy,
- `405 Method Not Allowed` — ścieżka istnieje, ale nie obsługuje metody,
- `409 Conflict` — konflikt z aktualnym stanem danych,
- `413 Payload Too Large` — przekroczony limit body,
- `415 Unsupported Media Type` — nieobsługiwany format danych,
- `500 Internal Server Error` — nieoczekiwany błąd.

## `backend/src/http/json.ts`

### Przeznaczenie pliku

Moduł czyta JSON ze strumienia żądania, wysyła odpowiedzi JSON i normalizuje błędy.

### Model typu JSON

JSON może zawierać:

- tekst,
- liczbę,
- wartość logiczną,
- `null`,
- tablicę innych wartości JSON,
- obiekt zawierający wartości JSON.

Rekurencyjny typ odzwierciedla tę strukturę. Nie każda wartość JavaScript jest poprawną wartością JSON, na przykład funkcja lub `undefined`.

### Strumień żądania

Node.js nie przekazuje body jako gotowego obiektu. `IncomingMessage` jest asynchronicznym strumieniem fragmentów danych. Fragmenty trzeba zebrać, policzyć i dopiero później sparsować.

### Bufory i bajty

`Buffer` reprezentuje dane binarne. Limit body jest liczony w bajtach, a nie w liczbie znaków. Ma to znaczenie dla znaków Unicode, które mogą zajmować więcej niż jeden bajt w UTF-8.

### Asynchroniczna iteracja

Pętla `for await` odczytuje kolejne fragmenty strumienia. Kod czeka na dane bez blokowania całego procesu Node.js.

### `Content-Type`

Nagłówek informuje o formacie body. Moduł akceptuje `application/json`, również z parametrami takimi jak kodowanie znaków.

Sprawdzenie formatu przed parsowaniem pozwala odróżnić:

- nieobsługiwany typ danych — `415`,
- niepoprawną składnię JSON — `400`.

### Limit body

Ograniczenie rozmiaru chroni pamięć serwera przed przypadkowym albo celowym przesłaniem bardzo dużego żądania.

### Serializacja i parsowanie

- parsowanie zamienia tekst JSON na wartość JavaScript,
- serializacja zamienia wartość JavaScript na tekst JSON.

Błąd parsera nie jest zwracany bezpośrednio klientowi. Zostaje zamieniony na kontrolowany błąd aplikacji.

### Nagłówki odpowiedzi

- `Content-Type` opisuje format i kodowanie odpowiedzi,
- `Content-Length` podaje rozmiar body w bajtach.

### `204 No Content`

Odpowiedź `204` nie zawiera body. Jest odpowiednia między innymi po prawidłowym usunięciu zasobu.

### Normalizacja błędów

JavaScript pozwala rzucić praktycznie dowolną wartość. Funkcja normalizująca zachowuje znane błędy `AppError`, a nieznane ukrywa pod neutralnym błędem `500`.

### Ukrywanie stack trace

Stack trace jest przydatny podczas rozwoju, ale może ujawniać szczegóły implementacji. Dlatego jest opcjonalnie zwracany tylko poza środowiskiem produkcyjnym.

## `backend/src/http/router.ts`

### Przeznaczenie pliku

Router dopasowuje metodę i ścieżkę żądania do funkcji obsługującej trasę.

### Zagadnienia HTTP

#### Metoda i ścieżka

Trasa jest określona przez połączenie metody HTTP oraz wzorca ścieżki. Ta sama ścieżka może obsługiwać różne operacje zależnie od metody.

#### Parametry ścieżki

Segment zaczynający się dwukropkiem jest parametrem dynamicznym. Router wyodrębnia wartość segmentu i przekazuje ją handlerowi.

#### Query string

Parametry po znaku zapytania nie są częścią ścieżki używanej do dopasowania trasy. Trafiają do `URLSearchParams`, który pozwala je odczytywać niezależnie od parametrów ścieżki.

#### `404` a `405`

Router wykonuje dwa logiczne sprawdzenia:

- jeżeli żadna trasa nie ma takiej ścieżki, zwraca `404`,
- jeżeli ścieżka istnieje, ale nie dla użytej metody, zwraca `405`.

### Zagadnienia TypeScript

#### Ograniczona unia metod

Typ metody dopuszcza tylko metody rzeczywiście obsługiwane przez router. Surowa wartość z requestu musi zostać zawężona przed użyciem.

#### Type narrowing

Seria warunków pozwala TypeScriptowi ustalić, że dowolny tekst jest jedną z obsługiwanych metod HTTP.

#### Interfejs kontekstu trasy

Handler otrzymuje jeden obiekt zawierający request, response, parametry ścieżki, query i identyfikator żądania. Ułatwia to późniejsze rozszerzanie kontekstu bez zmiany kolejności wielu argumentów.

#### Typ funkcji

Handler może być synchroniczny albo zwracać `Promise`. Router zawsze może na niego poczekać przez `await`.

#### Kolekcja tylko do odczytu przez użytkownika klasy

Lista tras jest prywatnym szczegółem routera. Trasy są dodawane przez publiczne metody zamiast bezpośredniej modyfikacji tablicy z zewnątrz.

### Algorytm dopasowania

Ścieżka wzorcowa i ścieżka requestu są dzielone na segmenty. Muszą mieć tę samą długość. Segment statyczny musi być identyczny, a segment dynamiczny jest zapisywany jako parametr.

Jest to prosty algorytm liniowy: router przegląda trasy w kolejności rejestracji. Jest wystarczający dla małej aplikacji edukacyjnej, choć rozbudowane frameworki używają bardziej zaawansowanych struktur.

### Dekodowanie URL

Zakodowane znaki w segmencie ścieżki są dekodowane. Pozwala to przesyłać znaki, które nie mogą występować w adresie bezpośrednio.

## `backend/src/server.ts`

### Przeznaczenie pliku

Plik jest punktem startowym aplikacji. Łączy konfigurację, router, obsługę odpowiedzi, endpointy techniczne i cykl życia procesu.

### Serwer `node:http`

Projekt używa wbudowanego modułu Node.js zamiast Expressa lub NestJS. Funkcja przekazana do serwera jest uruchamiana dla każdego żądania i otrzymuje surowe obiekty request oraz response.

### Centralna granica błędów

Obsługa routera znajduje się we wspólnym bloku `try/catch`. Błędy synchroniczne i odrzucone obietnice z handlerów trafiają do jednego mechanizmu odpowiedzi.

### Identyfikator żądania

Każdy request otrzymuje `requestId`:

- serwer zachowuje poprawną wartość przesłaną przez klienta,
- w przeciwnym razie generuje UUID,
- zwraca identyfikator w nagłówku odpowiedzi,
- dołącza go do błędu.

Pozwala to połączyć zgłoszenie klienta z logami konkretnego żądania.

### UUID

UUID jest identyfikatorem o bardzo małym prawdopodobieństwie kolizji, generowanym bez centralnego licznika. Nadaje się do identyfikowania żądań w systemie rozproszonym.

### CORS

Same-origin policy przeglądarki ogranicza żądania między różnymi originami. Origin obejmuje protokół, host i port. Backend i Angular uruchomione na różnych portach mają różne originy.

Nagłówki CORS deklarują:

- który origin może korzystać z API,
- jakie metody są dozwolone,
- jakie nagłówki klient może wysłać.

CORS jest mechanizmem przeglądarki, a nie systemem uwierzytelniania ani pełnym zabezpieczeniem API.

### Preflight `OPTIONS`

Przeglądarka może przed właściwym żądaniem wysłać `OPTIONS`, aby sprawdzić politykę CORS. Serwer odpowiada `204`, zanim request trafi do routera domenowego.

### Healthcheck

Endpoint zdrowia pozwala sprawdzić, czy proces działa i odpowiada. Wersja pod `/api/v1` dodatkowo potwierdza działanie publicznego prefiksu API.

Healthcheck procesu nie jest tym samym co healthcheck zależności. Dlatego istnieje osobny endpoint sprawdzający bazę.

### Uruchomienie nasłuchiwania

Serwer zaczyna przyjmować połączenia na porcie pochodzącym ze zwalidowanej konfiguracji.

### Sygnały procesu

- `SIGINT` zwykle pochodzi z przerwania przez użytkownika,
- `SIGTERM` jest często wysyłany przez system kontenerowy lub menedżer procesów.

### Graceful shutdown

Kontrolowane zamknięcie przestaje przyjmować nowe połączenia i pozwala zakończyć aktywne połączenia HTTP. Jest bezpieczniejsze od natychmiastowego przerwania procesu.

Aktualna implementacja zamyka serwer HTTP. W przyszłości pełne zamknięcie aplikacji powinno uwzględnić również zakończenie puli PostgreSQL.

---

# Etap 4. Warstwa komunikacji z PostgreSQL

## `backend/src/db/pool.ts`

### Przeznaczenie pliku

Moduł tworzy jedną współdzieloną pulę połączeń z PostgreSQL.

### Zagadnienia

#### Połączenie a pula połączeń

Tworzenie nowego połączenia dla każdego requestu jest kosztowne. Pula utrzymuje zestaw połączeń i wypożycza je operacjom bazodanowym.

Korzyści puli:

- ponowne użycie istniejących połączeń,
- ograniczenie liczby jednoczesnych połączeń,
- kolejkowanie operacji, gdy wszystkie połączenia są zajęte,
- centralna konfiguracja dostępu do bazy.

#### Connection string

Adres bazy zawiera protokół, użytkownika, hasło, host, port i nazwę bazy. Jest pobierany z konfiguracji, a nie zapisany na stałe w module.

#### Współdzielona instancja

Moduły ESM są buforowane po pierwszym imporcie, dlatego eksportowana pula stanowi jedną instancję współdzieloną przez aplikację.

#### Import CommonJS w ESM

Biblioteka `pg` jest konsumowana w konfiguracji modułów NodeNext przez import domyślny, z którego pobierana jest klasa `Pool`. Pokazuje to interoperacyjność między CommonJS i ESM.

#### Błąd bezczynnego klienta

Zdarzenie `error` puli dotyczy problemu na kliencie, który nie wykonuje aktualnie konkretnego zapytania. Błędy poszczególnych zapytań są obsługiwane bliżej miejsca ich wykonania.

## `backend/src/db/errors.ts`

### Przeznaczenie pliku

Moduł tłumaczy błędy PostgreSQL na błędy zrozumiałe dla reszty aplikacji.

### SQLSTATE

PostgreSQL oznacza rodzaje błędów stabilnymi pięcioznakowymi kodami. Projekt rozpoznaje:

- `23505` — naruszenie unikalności,
- `23503` — naruszenie klucza obcego,
- `23514` — naruszenie ograniczenia `CHECK`.

Kod jest stabilniejszą podstawą decyzji niż tekst komunikatu, który może zależeć od wersji lub konfiguracji językowej bazy.

### Mapowanie na HTTP

- duplikat jest konfliktem `409`,
- konflikt relacji jest mapowany na `409`,
- naruszenie reguły `CHECK` jest traktowane jako niepoprawne dane `400`,
- nierozpoznany problem staje się neutralnym `500`.

### Ukrywanie szczegółów infrastruktury

Klient API nie powinien otrzymywać surowego wyjątku biblioteki `pg`. Warstwa mapująca oddziela szczegóły PostgreSQL od publicznego kontraktu błędów.

### Type guard

Błąd jest początkowo typu `unknown`. Własny type guard sprawdza jego kształt w czasie działania i informuje TypeScript, kiedy można bezpiecznie odczytać kod oraz szczegóły PostgreSQL.

### Structural typing

Interfejs opisuje tylko pola potrzebne mapperowi. Obiekt nie musi być instancją konkretnej klasy, jeżeli ma wymagany kształt.

## `backend/src/db/query.ts`

### Przeznaczenie pliku

Moduł centralizuje wykonywanie pojedynczych zapytań poza transakcją.

### Parametryzowane zapytania

Tekst SQL i wartości są przekazywane osobno. Sterownik wysyła je do PostgreSQL bez ręcznego wklejania danych do tekstu zapytania.

Zapewnia to:

- ochronę przed SQL injection w wartościach,
- poprawne kodowanie danych,
- czytelne rozdzielenie polecenia od parametrów.

Parametryzacja wartości nie służy do dynamicznych nazw tabel, kolumn ani słów kluczowych. Takie elementy wymagają osobnego, kontrolowanego projektowania.

### Funkcja generyczna

Typ wiersza wyniku jest parametrem generycznym. Repozytorium może dzięki temu opisać kolumny zwracane przez konkretne zapytanie, a wspólny helper zachowuje tę informację.

### Ograniczenie generyka

Typ wiersza musi spełniać podstawowy kształt obsługiwany przez bibliotekę `pg`. Ograniczenie generyczne uniemożliwia przekazanie niepasującego typu.

### `QueryResult`

Wynik zapytania zawiera nie tylko tablicę wierszy, ale również metadane, takie jak liczba zmienionych rekordów.

### Konfiguracja zapytania

Drugi wariant helpera przyjmuje obiekt konfiguracyjny. Pozwala to korzystać z dodatkowych opcji sterownika, na przykład nazwanego prepared statement.

### Centralizacja mapowania błędów

Repozytoria nie muszą wielokrotnie implementować tego samego `try/catch`. Wszystkie zwykłe zapytania przechodzą przez jedną granicę mapowania błędów.

## `backend/src/db/transaction.ts`

### Przeznaczenie pliku

Moduł wykonuje grupę operacji jako jedną transakcję PostgreSQL.

### Transakcja

Transakcja zapewnia zasadę „wszystko albo nic”:

- `BEGIN` rozpoczyna transakcję,
- callback wykonuje operacje domenowe,
- `COMMIT` zatwierdza komplet zmian,
- `ROLLBACK` wycofuje zmiany po błędzie.

### ACID

Transakcje są związane z właściwościami:

- atomicity — operacje zatwierdzają się razem albo wcale,
- consistency — ograniczenia prowadzą bazę między poprawnymi stanami,
- isolation — równoległe transakcje są od siebie kontrolowanie odseparowane,
- durability — zatwierdzone dane przetrwają awarię zgodnie z gwarancjami bazy.

### Jedno połączenie

Wszystkie polecenia transakcji muszą być wykonane na tym samym kliencie. Użycie ogólnej puli dla każdego zapytania mogłoby skierować kolejne polecenia na inne połączenia, a więc poza rozpoczętą transakcję.

### Callback transakcyjny

Helper zarządza technicznym cyklem transakcji, a przekazany callback opisuje operacje biznesowe. Wynik callbacku staje się wynikiem całej funkcji.

### Ograniczony typ klienta

Utility type `Pick` tworzy typ udostępniający tylko metodę potrzebną kodowi domenowemu. Ograniczenie powierzchni API utrudnia przypadkowe ręczne zwolnienie klienta albo zarządzanie nim poza helperem.

### `try`, `catch`, `finally`

- `try` obejmuje rozpoczęcie i poprawne zatwierdzenie,
- `catch` wycofuje transakcję i mapuje błąd,
- `finally` zawsze zwraca klienta do puli.

Zwolnienie klienta jest konieczne. Brak `release` stopniowo wyczerpałby pulę i zatrzymał nowe operacje.

### Kiedy potrzebna jest transakcja

Transakcja jest potrzebna, gdy jedna operacja biznesowa wykonuje kilka zależnych zapisów. Nie jest konieczna dla każdego pojedynczego odczytu lub pojedynczego zapisu.

## `backend/src/server.ts` — healthcheck bazy

### Zagadnienia

Endpoint bazy wykonuje najprostsze zapytanie niewymagające tabel. Sprawdza w ten sposób:

- poprawność adresu połączenia,
- dostępność PostgreSQL,
- możliwość uzyskania połączenia z puli,
- możliwość wykonania zapytania,
- przejście błędu przez wspólną obsługę API.

Jest to głębszy healthcheck niż samo potwierdzenie, że proces Node.js działa.

---

# Zagadnienia przekrojowe TypeScript wykorzystane w wielu plikach

## Typy tylko na etapie kompilacji

Interfejsy, aliasy typów i większość informacji generycznych nie istnieją w uruchomionym JavaScripcie. Pomagają kompilatorowi i programiście, ale dane z HTTP, bazy i środowiska nadal wymagają sprawdzania w czasie działania.

## `import type`

Import typu jest usuwany po kompilacji. Jawne oznaczenie zapobiega przypadkowemu traktowaniu typu jako wartości potrzebnej w runtime.

## `unknown` zamiast `any`

`unknown` pozwala przechować dowolną wartość, ale wymaga jej sprawdzenia przed użyciem. `any` wyłączałby w tym miejscu kontrolę TypeScriptu.

## Zawężanie typów

Warunki wykorzystujące `typeof`, porównania wartości, `instanceof`, sprawdzenie `null` oraz własne type guardy zmieniają szeroki typ na dokładniejszy.

## Funkcje asynchroniczne

Funkcja `async` zwraca `Promise`. `await` wstrzymuje daną operację asynchroniczną bez blokowania całego procesu Node.js.

Odrzucony `Promise` zachowuje się jak rzucony błąd i może zostać przechwycony przez `try/catch`, jeśli wywołanie jest oczekiwane przez `await`.

## Generyki

Generyk pozwala stworzyć funkcję działającą na wielu typach bez utraty informacji o konkretnym typie użytym przy wywołaniu. W projekcie służy do typowania wyników zapytań i wyniku transakcji.

## Operator spread

Rozwijanie obiektu służy do warunkowego dodawania pól. Jest używane tam, gdzie rygorystyczne pola opcjonalne wymagają pominięcia pola zamiast przypisania `undefined`.

## Prywatność i `readonly`

Prywatne pola ukrywają szczegóły implementacji klasy. `readonly` zabrania ponownego przypisania pola po inicjalizacji, choć nie zawsze oznacza głęboką niezmienność zawartości obiektu lub tablicy.

## Typ strukturalny

TypeScript porównuje głównie kształt wartości. Obiekt jest zgodny z interfejsem, jeśli ma wymagane pola odpowiednich typów, niezależnie od tego, gdzie został utworzony.

---

# Zagadnienia przekrojowe backendu

## Cykl żądania

Aktualny przepływ żądania wygląda następująco:

1. Node.js przyjmuje połączenie HTTP.
2. Serwer tworzy albo odczytuje `requestId`.
3. Ustawiane są nagłówki CORS.
4. Preflight `OPTIONS` może zostać zakończony od razu.
5. Router analizuje URL i metodę.
6. Router uruchamia znaleziony handler.
7. Handler może wykonać zapytanie przez warstwę bazy.
8. Wynik jest serializowany do JSON.
9. Błąd z dowolnej warstwy trafia do wspólnej granicy błędów.

## Rozdzielenie odpowiedzialności

- konfiguracja odpowiada za środowisko uruchomieniowe,
- serwer odpowiada za cykl życia HTTP,
- router odpowiada za wybór handlera,
- moduł JSON odpowiada za format danych HTTP,
- `AppError` opisuje kontrolowane problemy,
- warstwa `db` odpowiada za techniczną komunikację z PostgreSQL,
- baza odpowiada za trwałość i ostateczną integralność relacji.

## Obrona warstwowa

Bezpieczeństwo i poprawność nie opierają się na jednym sprawdzeniu:

- limit body chroni pamięć procesu,
- `Content-Type` chroni kontrakt danych,
- parser kontroluje składnię JSON,
- przyszłe walidatory będą kontrolować strukturę i zakres wartości,
- parametryzowane zapytania chronią przed SQL injection w wartościach,
- ograniczenia bazy chronią integralność również przy równoległych operacjach,
- mapowanie błędów ukrywa szczegóły infrastruktury.

## Źródła prawdy

- schemat SQL jest źródłem prawdy dla istniejącego modelu danych,
- konfiguracja środowiska jest centralizowana w `env.ts`,
- kontrakt błędów jest centralizowany w `AppError` i module JSON,
- plan backendu określa kolejność dalszych prac.

---

# Granica obecnego etapu

Warstwa techniczna potrafi obecnie:

- uruchomić serwer,
- rozpoznać trasę,
- zwrócić JSON,
- zwrócić kontrolowany błąd,
- połączyć się z PostgreSQL,
- wykonać parametryzowane zapytanie,
- wykonać grupę operacji w transakcji.

Nie istnieją jeszcze pliki modułu klubów, takie jak kontroler, serwis, repozytorium, typy i walidacja. Ich utworzenie będzie pierwszym zastosowaniem obecnego fundamentu do rzeczywistego zasobu domenowego.

