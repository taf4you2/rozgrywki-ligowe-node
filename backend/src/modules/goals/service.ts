import { AppError } from '../../errors/app-error.js';

import type { GoalsRepository } from './repository.js';
import type { Goal, GoalInput } from './types.js';

// Klasa przechowuje reguły biznesowe bramek.
export class GoalsService {
    // Konstruktor przyjmuje repozytorium, żeby serwis nie wykonywał SQL bezpośrednio.
    public constructor(private readonly repository: GoalsRepository) {}

    // Metoda sprawdza mecz i zwraca jego bramki.
    public async getMatchGoals(matchId: number): Promise<Goal[]> {
        await this.ensureMatchExists(matchId);

        return this.repository.findByMatchId(matchId);
    }

    // Metoda sprawdza mecz, strzelca i opcjonalnego asystującego przed zapisem.
    public async createGoal(matchId: number, input: GoalInput): Promise<Goal> {
        await this.ensureMatchExists(matchId);
        await this.ensurePlayersExist(input);

        return this.repository.create(matchId, input);
    }

    // Metoda sprawdza bramkę i zawodników przed aktualizacją.
    public async updateGoal(id: number, input: GoalInput): Promise<Goal> {
        await this.getGoal(id);
        await this.ensurePlayersExist(input);

        const goal = await this.repository.update(id, input);

        if (goal === null) {
            throw AppError.notFound('Goal not found');
        }

        return goal;
    }

    // Metoda usuwa bramkę albo zwraca błąd 404.
    public async deleteGoal(id: number): Promise<void> {
        const deleted = await this.repository.delete(id);

        if (!deleted) {
            throw AppError.notFound('Goal not found');
        }
    }

    // Metoda pobiera jedną bramkę potrzebną podczas aktualizacji.
    private async getGoal(id: number): Promise<Goal> {
        const goal = await this.repository.findById(id);

        if (goal === null) {
            throw AppError.notFound('Goal not found');
        }

        return goal;
    }

    // Metoda pilnuje istnienia meczu użytego w zagnieżdżonym adresie.
    private async ensureMatchExists(matchId: number): Promise<void> {
        const exists = await this.repository.matchExists(matchId);

        if (!exists) {
            throw AppError.notFound('Match not found');
        }
    }

    // Metoda sprawdza strzelca i, jeśli istnieje, asystującego.
    private async ensurePlayersExist(input: GoalInput): Promise<void> {
        const scorerExists = await this.repository.playerExists(input.scorerId);

        if (!scorerExists) {
            throw AppError.notFound('Scorer not found');
        }

        if (input.assistantId === null) {
            return;
        }

        const assistantExists = await this.repository.playerExists(input.assistantId);

        if (!assistantExists) {
            throw AppError.notFound('Assistant not found');
        }
    }
}
