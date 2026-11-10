import type { StatsRepository } from './repository.js';
import type { AppearanceStat, CardStat, TopScorerStat } from './types.js';

// Klasa tworzy prostą warstwę pomiędzy kontrolerem i zapytaniami statystycznymi.
export class StatsService {
    // Konstruktor przyjmuje repozytorium, żeby kontroler nie korzystał z SQL bezpośrednio.
    public constructor(private readonly repository: StatsRepository) {}

    // Metoda pobiera klasyfikację strzelców.
    public async getTopScorers(limit: number): Promise<TopScorerStat[]> {
        return this.repository.findTopScorers(limit);
    }

    // Metoda pobiera ranking kartek i fauli.
    public async getCards(limit: number): Promise<CardStat[]> {
        return this.repository.findCards(limit);
    }

    // Metoda pobiera ranking liczby występów.
    public async getAppearances(limit: number): Promise<AppearanceStat[]> {
        return this.repository.findAppearances(limit);
    }
}
