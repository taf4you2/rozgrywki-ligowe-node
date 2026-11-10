import { AppError } from '../../errors/app-error.js';

import type { AppearancesRepository } from './repository.js';
import type { Appearance, AppearanceInput } from './types.js';

// Klasa pilnuje reguł biznesowych występów.
export class AppearancesService {
    // Konstruktor przyjmuje repozytorium, żeby logika była łatwiejsza do sprawdzenia w testach.
    public constructor(private readonly repository: AppearancesRepository) {}

    // Metoda sprawdza mecz i zwraca jego listę występów.
    public async getMatchAppearances(matchId: number): Promise<Appearance[]> {
        await this.ensureMatchExists(matchId);

        return this.repository.findByMatchId(matchId);
    }

    // Metoda sprawdza mecz oraz zawodnika przed utworzeniem występu.
    // Ograniczenie UNIQUE w bazie blokuje drugi występ tego samego zawodnika w meczu.
    public async createAppearance(
        matchId: number,
        input: AppearanceInput,
    ): Promise<Appearance> {
        await this.ensureMatchExists(matchId);
        await this.ensurePlayerExists(input.playerId);

        return this.repository.create(matchId, input);
    }

    // Metoda sprawdza występ i zawodnika przed pełną aktualizacją.
    public async updateAppearance(
        id: number,
        input: AppearanceInput,
    ): Promise<Appearance> {
        await this.getAppearance(id);
        await this.ensurePlayerExists(input.playerId);

        const appearance = await this.repository.update(id, input);

        if (appearance === null) {
            throw AppError.notFound('Appearance not found');
        }

        return appearance;
    }

    // Metoda usuwa występ albo zwraca błąd 404.
    public async deleteAppearance(id: number): Promise<void> {
        const deleted = await this.repository.delete(id);

        if (!deleted) {
            throw AppError.notFound('Appearance not found');
        }
    }

    // Metoda pobiera występ używany podczas aktualizacji.
    private async getAppearance(id: number): Promise<Appearance> {
        const appearance = await this.repository.findById(id);

        if (appearance === null) {
            throw AppError.notFound('Appearance not found');
        }

        return appearance;
    }

    // Metoda pilnuje, żeby endpoint zagnieżdżony nie zwrócił pustej listy dla nieistniejącego meczu.
    private async ensureMatchExists(matchId: number): Promise<void> {
        const exists = await this.repository.matchExists(matchId);

        if (!exists) {
            throw AppError.notFound('Match not found');
        }
    }

    // Metoda pilnuje, żeby występ zawsze wskazywał istniejącego zawodnika.
    private async ensurePlayerExists(playerId: number): Promise<void> {
        const exists = await this.repository.playerExists(playerId);

        if (!exists) {
            throw AppError.notFound('Player not found');
        }
    }
}
