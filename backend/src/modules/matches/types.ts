// Typ opisuje dane potrzebne do utworzenia albo pełnej edycji meczu.
// Wynik może być null, ponieważ taki zapis oznacza mecz, który nie został jeszcze rozegrany.
export type MatchInput = {
    homeClubId: number;
    awayClubId: number;
    matchDate: string;
    homeScore: number | null;
    awayScore: number | null;
};

// Typ opisuje mecz zwracany przez API.
// Zmienia nazwy z bazy na camelCase, żeby odpowiedź była wygodniejsza dla frontendu.
export type Match = MatchInput & {
    id: number;
};

// Typ opisuje filtry dostępne podczas pobierania terminarza.
export type MatchListFilters = {
    clubId?: number;
    from?: string;
    to?: string;
    played?: boolean;
};
