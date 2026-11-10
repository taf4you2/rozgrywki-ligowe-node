import { AppError } from '../../errors/app-error.js';

import type { PlayersRepository } from './repository.js';
import type {
    Player,
    PlayerInput,
    PlayerListFilters,
    PlayerTransferInput,
} from './types.js';

// Klasa przechowuje reguły biznesowe zawodników.
// Oddziela decyzje domenowe od zapytań SQL oraz szczegółów protokołu HTTP.
export class PlayersService {
    // Konstruktor przyjmuje repozytorium jako zależność, co ułatwia testowanie serwisu.
    public constructor(
        private readonly repository: PlayersRepository,
    ) {}

    // Metoda pobiera listę zawodników zgodną z przekazanymi filtrami.
    public async getPlayers(
        filters: PlayerListFilters,
    ): Promise<Player[]> {
        return this.repository.findAll(filters);
    }

    // Metoda pobiera jednego zawodnika i zamienia brak rekordu na kontrolowany błąd 404.
    public async getPlayer(id: number): Promise<Player> {
        const player = await this.repository.findById(id);

        if (player === null) {
            throw AppError.notFound('Player not found');
        }

        return player;
    }

    // Metoda sprawdza klub przed utworzeniem zawodnika.
    public async createPlayer(input: PlayerInput): Promise<Player> {
        await this.ensureClubExists(input.clubId);

        return this.repository.create(input);
    }

    // Metoda sprawdza istnienie zawodnika i klubu przed pełną aktualizacją.
    public async updatePlayer(
        id: number,
        input: PlayerInput,
    ): Promise<Player> {
        await this.getPlayer(id);
        await this.ensureClubExists(input.clubId);

        const player = await this.repository.update(id, input);

        if (player === null) {
            throw AppError.notFound('Player not found');
        }

        return player;
    }

    // Metoda blokuje transfer do aktualnego klubu i potwierdza istnienie klubu docelowego.
    public async transferPlayer(
        id: number,
        input: PlayerTransferInput,
    ): Promise<Player> {
        const player = await this.getPlayer(id);

        if (player.clubId === input.clubId) {
            throw AppError.conflict(
                'Player already belongs to this club',
            );
        }

        await this.ensureClubExists(input.clubId);

        const transferredPlayer = await this.repository.transfer(
            id,
            input.clubId,
        );

        if (transferredPlayer === null) {
            throw AppError.notFound('Player not found');
        }

        return transferredPlayer;
    }

    // Metoda usuwa zawodnika i zwraca 404, jeśli rekord nie istniał.
    // Wspólna obsługa błędów PostgreSQL zamienia konflikt klucza obcego na odpowiedź 409.
    public async deletePlayer(id: number): Promise<void> {
        const deleted = await this.repository.delete(id);

        if (!deleted) {
            throw AppError.notFound('Player not found');
        }
    }

    // Metoda centralizuje regułę wymagającą istnienia klubu.
    private async ensureClubExists(clubId: number): Promise<void> {
        const exists = await this.repository.clubExists(clubId);

        if (!exists) {
            throw AppError.notFound('Club not found');
        }
    }
}
