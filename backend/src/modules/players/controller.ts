import { env } from '../../config/env.js';
import {
    readJsonBody,
    sendJson,
    sendNoContent,
} from '../../http/json.js';
import type { RouteContext, Router } from '../../http/router.js';

import { PlayersRepository } from './repository.js';
import { PlayersService } from './service.js';
import {
    parsePlayerFilters,
    parsePlayerId,
    validatePlayerInput,
    validatePlayerTransferInput,
} from './validation.js';

// Kontroler tworzy jedną instancję repozytorium i przekazuje ją do serwisu.
// Instancja nie przechowuje stanu żądania, dlatego może obsługiwać kolejne wywołania.
const playersRepository = new PlayersRepository();
const playersService = new PlayersService(playersRepository);

// Funkcja rejestruje endpointy zawodników w głównym routerze aplikacji.
export function registerPlayerRoutes(router: Router): void {
    router.get('/api/v1/players', getPlayers);
    router.get('/api/v1/players/:id', getPlayer);
    router.post('/api/v1/players', createPlayer);
    router.put('/api/v1/players/:id', updatePlayer);
    router.delete('/api/v1/players/:id', deletePlayer);
    router.patch('/api/v1/players/:id/transfer', transferPlayer);
}

// Handler sprawdza parametry query i pobiera przefiltrowaną listę zawodników.
async function getPlayers({
    res,
    query,
}: RouteContext): Promise<void> {
    const filters = parsePlayerFilters(query);
    const players = await playersService.getPlayers(filters);

    sendJson(res, players);
}

// Handler sprawdza identyfikator ze ścieżki i pobiera pojedynczego zawodnika.
async function getPlayer({
    res,
    params,
}: RouteContext): Promise<void> {
    const id = parsePlayerId(params.id);
    const player = await playersService.getPlayer(id);

    sendJson(res, player);
}

// Handler odczytuje i waliduje JSON przed utworzeniem zawodnika.
async function createPlayer({
    req,
    res,
}: RouteContext): Promise<void> {
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validatePlayerInput(body);
    const player = await playersService.createPlayer(input);

    res.setHeader('Location', `/api/v1/players/${player.id}`);

    sendJson(res, player, 201);
}

// Handler realizuje pełną aktualizację zawodnika przez metodę PUT.
async function updatePlayer({
    req,
    res,
    params,
}: RouteContext): Promise<void> {
    const id = parsePlayerId(params.id);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validatePlayerInput(body);
    const player = await playersService.updatePlayer(id, input);

    sendJson(res, player);
}

// Handler zmienia wyłącznie klub zawodnika przez częściową aktualizację PATCH.
async function transferPlayer({
    req,
    res,
    params,
}: RouteContext): Promise<void> {
    const id = parsePlayerId(params.id);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validatePlayerTransferInput(body);
    const player = await playersService.transferPlayer(id, input);

    sendJson(res, player);
}

// Handler usuwa zawodnika i zwraca pustą odpowiedź 204 po powodzeniu.
async function deletePlayer({
    res,
    params,
}: RouteContext): Promise<void> {
    const id = parsePlayerId(params.id);

    await playersService.deletePlayer(id);

    sendNoContent(res);
}
