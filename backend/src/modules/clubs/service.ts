import { AppError } from '../../errors/app-error.js';

import type { ClubsRepository } from './repository.js';

import type { Club, ClubInput, ClubPlayer } from './types.js';

// Klasa skupia reguły działania modułu i oddziela je od transportu HTTP oraz zapytań SQL.
// Kontroler dzięki temu obsługuje tylko żądania, a repozytorium tylko komunikację z bazą.
export class ClubsService {
    // Konstruktor przyjmuje repozytorium jako zależność, co ułatwia późniejsze podstawienie implementacji testowej.
    public constructor(private readonly repository: ClubsRepository) {}

    // Metoda przekazuje pobranie listy do repozytorium, ponieważ lista nie wymaga dodatkowej reguły biznesowej.
    public async getClubs(): Promise<Club[]> {
        return this.repository.findAll();
    }

    // Metoda pobiera klub i zamienia brak rekordu na kontrolowany błąd domenowy 404.
    // Centralizuje tę regułę, aby każdy endpoint zgłaszał brak klubu w ten sam sposób.
    public async getClub(id: number): Promise<Club> {
        const club = await this.repository.findById(id);

        if (club === null) {
            throw AppError.notFound('Club not found');
        }

        return club;
    }

    // Metoda przekazuje zwalidowane dane do repozytorium.
    // Unikalność nazwy nadal egzekwuje baza, a wspólna warstwa błędów mapuje naruszenie na odpowiedź 409.
    public async createClub(input: ClubInput): Promise<Club> {
        return this.repository.create(input);
    }

    // Metoda aktualizuje klub i zwraca 404, jeśli instrukcja UPDATE nie znalazła rekordu.
    public async updateClub(id: number, input: ClubInput): Promise<Club> {
        const club = await this.repository.update(id, input);

        if (club === null) {
            throw AppError.notFound('Club not found');
        }

        return club;
    }

    // Metoda usuwa klub i odróżnia brak rekordu od poprawnego usunięcia.
    // Konflikt relacji z zawodnikami lub meczami zgłasza baza i mapuje go wspólna obsługa błędów PostgreSQL.
    public async deleteClub(id: number): Promise<void> {
        const deleted = await this.repository.delete(id);

        if (!deleted) {
            throw AppError.notFound('Club not found');
        }
    }

    // Metoda najpierw potwierdza istnienie klubu, a dopiero później pobiera jego zawodników.
    // Dzięki temu odróżnia nieistniejący klub od istniejącego klubu z pustą listą zawodników.
    public async getClubPlayers(id: number): Promise<ClubPlayer[]> {
        await this.getClub(id);

        return this.repository.findPlayersByClubId(id);
    }
}
