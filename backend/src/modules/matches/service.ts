import { AppError } from '../../errors/app-error.js';

import type { MatchesRepository } from './repository.js';
import type { Match, MatchInput, MatchListFilters } from './types.js';

// Klasa przechowuje reguły biznesowe meczów.
// Pozwala kontrolerowi zajmować się tylko żądaniem i odpowiedzią HTTP.
export class MatchesService {
    // Konstruktor dostaje repozytorium, żeby serwis nie tworzył połączenia z bazą samodzielnie.
    public constructor(private readonly repository: MatchesRepository) {}

    // Metoda pobiera terminarz według sprawdzonych wcześniej filtrów.
    public async getMatches(filters: MatchListFilters): Promise<Match[]> {
        return this.repository.findAll(filters);
    }

    // Metoda zwraca mecz albo kontrolowany błąd 404.
    public async getMatch(id: number): Promise<Match> {
        const match = await this.repository.findById(id);

        if (match === null) {
            throw AppError.notFound('Match not found');
        }

        return match;
    }

    // Metoda sprawdza oba kluby przed utworzeniem meczu.
    public async createMatch(input: MatchInput): Promise<Match> {
        await this.ensureClubsExist(input);

        return this.repository.create(input);
    }

    // Metoda sprawdza mecz oraz oba kluby przed wykonaniem aktualizacji.
    public async updateMatch(id: number, input: MatchInput): Promise<Match> {
        await this.getMatch(id);
        await this.ensureClubsExist(input);

        const match = await this.repository.update(id, input);

        if (match === null) {
            throw AppError.notFound('Match not found');
        }

        return match;
    }

    // Metoda usuwa mecz i zwraca 404, jeśli wskazany rekord nie istnieje.
    public async deleteMatch(id: number): Promise<void> {
        const deleted = await this.repository.delete(id);

        if (!deleted) {
            throw AppError.notFound('Match not found');
        }
    }

    // Metoda pilnuje, żeby gospodarz i gość wskazywali istniejące kluby.
    private async ensureClubsExist(input: MatchInput): Promise<void> {
        const homeClubExists = await this.repository.clubExists(input.homeClubId);

        if (!homeClubExists) {
            throw AppError.notFound('Home club not found');
        }

        const awayClubExists = await this.repository.clubExists(input.awayClubId);

        if (!awayClubExists) {
            throw AppError.notFound('Away club not found');
        }
    }
}
