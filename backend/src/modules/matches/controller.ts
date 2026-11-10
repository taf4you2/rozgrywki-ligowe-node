import { env } from '../../config/env.js';
import { readJsonBody, sendJson, sendNoContent } from '../../http/json.js';
import type { RouteContext, Router } from '../../http/router.js';

import { MatchesRepository } from './repository.js';
import { MatchesService } from './service.js';
import { parseMatchFilters, parseMatchId, validateMatchInput } from './validation.js';

// Kontroler tworzy obiekty modułu jeden raz, ponieważ nie przechowują stanu pojedynczego żądania.
const matchesRepository = new MatchesRepository();
const matchesService = new MatchesService(matchesRepository);

// Funkcja rejestruje wszystkie endpointy CRUD meczów.
export function registerMatchRoutes(router: Router): void {
    router.get('/api/v1/matches', getMatches);
    router.get('/api/v1/matches/:id', getMatch);
    router.post('/api/v1/matches', createMatch);
    router.put('/api/v1/matches/:id', updateMatch);
    router.delete('/api/v1/matches/:id', deleteMatch);
}

// Handler pobiera filtry z query string i przekazuje je do serwisu.
async function getMatches({ res, query }: RouteContext): Promise<void> {
    const filters = parseMatchFilters(query);
    const matches = await matchesService.getMatches(filters);

    sendJson(res, matches);
}

// Handler pobiera szczegóły jednego meczu.
async function getMatch({ res, params }: RouteContext): Promise<void> {
    const id = parseMatchId(params.id);
    const match = await matchesService.getMatch(id);

    sendJson(res, match);
}

// Handler czyta JSON, sprawdza dane i zwraca utworzony mecz ze statusem 201.
async function createMatch({ req, res }: RouteContext): Promise<void> {
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validateMatchInput(body);
    const match = await matchesService.createMatch(input);

    res.setHeader('Location', `/api/v1/matches/${match.id}`);
    sendJson(res, match, 201);
}

// Handler wykonuje pełną aktualizację meczu przez PUT.
async function updateMatch({ req, res, params }: RouteContext): Promise<void> {
    const id = parseMatchId(params.id);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validateMatchInput(body);
    const match = await matchesService.updateMatch(id, input);

    sendJson(res, match);
}

// Handler usuwa mecz i kończy odpowiedź statusem 204 bez body.
async function deleteMatch({ res, params }: RouteContext): Promise<void> {
    const id = parseMatchId(params.id);

    await matchesService.deleteMatch(id);

    sendNoContent(res);
}
