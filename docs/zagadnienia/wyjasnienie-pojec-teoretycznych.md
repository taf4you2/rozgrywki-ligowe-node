# Wyjaśnienie pojęć teoretycznych

Poniżej znajduje się wyjaśnienie najważniejszych pojęć teoretycznych wykorzystywanych w projekcie, z podziałem na poszczególne etapy realizacji.

## Etap 0: Planowanie architektury

- **Architektura warstwowa**: Podział aplikacji na logiczne warstwy (kontroler obsługujący HTTP, serwis z logiką biznesową, repozytorium komunikujące się z bazą danych) w celu zachowania czytelności kodu i separacji odpowiedzialności.
- **REST API**: Konwencja projektowania API komunikującego się przez protokół HTTP. Opiera się na zasobach i standardowych metodach: `GET` (odczyt), `POST` (tworzenie), `PUT`/`PATCH` (aktualizacja), `DELETE` (usuwanie).
- **CRUD**: Zestaw czterech podstawowych operacji wykonywanych na encjach: Create, Read, Update, Delete.
- **Reguły biznesowe i ograniczenia bazy**: Rozdzielenie kontroli – aplikacja pilnuje przyjaznych komunikatów o błędach, a baza dba o ostateczną, ścisłą integralność i prawidłowość danych.
- **Architektura klient-serwer**: Odseparowanie i niezależność interfejsu klienta (frontendu) od serwera – komunikacja następuje po wyznaczonym kontrakcie przez protokół HTTP.

## Etap 1: Konfiguracja backendu i narzędzi

- **ESM (ECMAScript Modules)**: Standard importowania i eksportowania elementów w JavaScript i TypeScript (użycie `import`/`export`), stosowany współcześnie w miejsce starszego systemu CommonJS (`require`).
- **Lockfile (`package-lock.json`)**: Plik zapisujący konkretne, ścisłe wersje pakietów i ich pobocznych zależności. Zapewnia powtarzalność instalacji dla każdego programisty i środowiska.
- **TypeScript w trybie ścisłym (`strict`)**: Zestaw rygorystycznych reguł weryfikowanych podczas budowania, m.in. wymaganie obsługi zmiennych niezdefiniowanych (`undefined` / `null`) czy zakaz używania niejawnego `any`.
- **Zmienne środowiskowe i Fail Fast**: Odseparowanie konfiguracji (np. adresów, haseł do baz) od kodu. Podejście "Fail Fast" polega na natychmiastowym przerwaniu startu programu w razie brakujących zmiennych, unikając niespodziewanych błędów w trakcie działania.
- **Konteneryzacja (Dockerfile)**: Przepis na budowę obrazu uruchomieniowego. Definiuje system bazowy, zależności, pliki aplikacji i deterministyczne środowisko startowe.

## Etap 2: PostgreSQL i model danych

- **DDL i DML**: DDL (Data Definition Language) to instrukcje definiujące strukturę schematu bazy danych (tworzenie tabel, ograniczeń), natomiast DML (Data Manipulation Language) to operacje na wprowadzonych do nich danych (np. `INSERT`, `SELECT`).
- **Klucze główne, klucze obce, indeksy**: Klucze główne jednoznacznie identyfikują dany wiersz. Klucze obce gwarantują połączenia między encjami, a indeksy – przyspieszają często powtarzane wyszukiwania i łączenia.
- **Transakcja inicjalizacyjna i migracje**: Wszystkie polecenia powołania tabel w bazowym skrypcie spięte w jednym bloku – zabezpiecza to bazę przed pozostawieniem częściowo uszkodzonego modelu przy wystąpieniu błędu. Późniejsze wersjonowane, mniejsze uaktualnienia bazy to tzw. migracje.
- **Logika trójwartościowa SQL i `NULL`**: Brak przypisanej wartości w bazie; operacje na nich (równość, różność) posiadają osobne reguły – różniące się od zwykłego poruszania się po twardych wartościach.
- **Ograniczenia integralności (Constraints)**: Sztywno definiowane, wbudowane w silnik SQL reguły, takie jak obecność wartości (`NOT NULL`), unikalność (`UNIQUE`), poprawne ramy matematyczne (`CHECK`), wartości w zastępstwie brakujących (`DEFAULT`) i blokowanie przed trwałym pozbyciem się połączonego rekordu (`ON DELETE RESTRICT`).
- **Idempotencja**: Właściwość skryptu startowego zapobiegająca np. dodaniu duplikatów przy jego ponownym, n-tym restarcie. Zwraca on zawsze poprawny stan startowy na koniec operacji.
- **Docker Compose**: Narzędzie integrujące aplikację – ustawia sieć widoczną tylko między samymi kontenerami (gdzie widzą się one po nazwach usług bez localhostów) i przypina odpowiednio trwałe wolumeny do zapisywania postępów z bazy w izolowanym środowisku i healthchecki weryfikujące, w jakiej kolejności odpalać warstwy na start.

## Etap 3: Fundament HTTP bez frameworka

- **CORS (Cross-Origin Resource Sharing)**: Komunikacja nagłówkami między przeglądarką i serwerem deklarująca zasady dostępu do API z zewnętrznych aplikacji, uwzględniając wstępne "zapytania kontrolne" (preflight `OPTIONS`).
- **Graceful shutdown**: Kontrolowane kończenie pracy serwera – przestaje on przyjmować nowe połączenia i pozwala już rozpoczętym i trwającym zakończyć swój cykl. 
- **Strumienie i buforowanie JSON**: Standard czytania protokołów asynchronicznie kawałkami bez zapychania procesu jednowątkowego – strumienie są składane we właściwą formę tekstową ucinając prośbę, gdy body jest sztucznie przeładowane ponad limit pamięci.
- **Błędy operacyjne i HTTP status codes**: Standaryzowany protokół uchybień dla logiki kodu odróżniający je od niespodziewanego zepsucia infrastruktury (`500`) i oddający kody HTTP: `400` (niepoprawny format), `404` (brak trasy lub zasobu), czy `409` (konflikt danych).
- **Router i parsowanie URL**: Oprogramowany mechanizm rozdzielania ścieżek URL (np. ucinający dekodowane fragmenty lub tzw. query strings przypięte za znakiem zapytania) by rozdzielić konkretne metody zapytania na konkretne obsługujące je funkcje.
- **Identyfikator żądania (UUID)**: Standard unikalnego podpisu zapytania pozwalający w środowisku połączyć klienta z konkretnym, wygenerowanym wpisem w konsoli, zapobiegając przemieszaniu.

## Etap 4: Warstwa komunikacji z PostgreSQL

- **Pula połączeń (Connection Pool)**: Recykling utworzonych połączeń. Technika ucinająca obciążenie maszyny związane z ponowną konfiguracją łącza TCP dla każdej drobnej obsługi bazy.
- **Zapytania parametryzowane**: Podział komendy na tekst komendy i przypinane na boku nieprzetworzone surowe wartości. Jest to tarcza zabezpieczająca serwer przed manipulacją poleceniem SQL podanym ze spreparowanego wejścia użytkownika (SQL injection).
- **Transakcje i zasada ACID**: Sposób zgrupowania zapytań o wspólne bezpieczeństwo – jeśli drugie zapytanie wywali wyjątek, wycofujemy wszystkie wcześniejsze (`ROLLBACK`). ACID to skrótowiec od `Atomicity` (wszystko albo nic), `Consistency` (zgodność z wbudowanymi constraintami), `Isolation` (separacja zmian trwających w tle przed wglądem reszty) i `Durability` (gwarancja fizycznego utrwalenia na dysku).
- **Strukturalne typowanie błędu**: Ograniczanie z wykorzystaniem tzw. Duck typingu w TypeScript nieprzewidzianych obiektów (`unknown`) – do weryfikacji specyficznych kodów SQLSTATE zrzuconych nam z bazy na ustandaryzowany odpowiednik API. Wymaga to odpowiednich "type guardów", sprawdzających dynamicznie budowę złapanego obiektu wywołania.
