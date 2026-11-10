import { env } from '../../config/env.js';
import { readJsonBody, sendJson, sendNoContent } from '../../http/json.js';
import type { RouteContext, Router } from '../../http/router.js';

import { AppearancesRepository } from './repository.js';
import { AppearancesService } from './service.js';
import {
    parseAppearanceId,
    parseAppearanceMatchId,
    validateCreateAppearanceInput,
    validateUpdateAppearanceInput,
} from './validation.js';

// Kontroler tworzy serwis i repozytorium używane przez wszystkie endpointy występów.
const appearancesRepository = new AppearancesRepository();
const appearancesService = new AppearancesService(appearancesRepository);

// Funkcja rejestruje trasy zagnieżdżone pod meczem oraz trasy pojedynczego występu.
export function registerAppearanceRoutes(router: Router): void {
    router.get('/api/v1/matches/:matchId/appearances', getMatchAppearances);
    router.post('/api/v1/matches/:matchId/appearances', createAppearance);
    router.put('/api/v1/appearances/:id', updateAppearance);
    router.delete('/api/v1/appearances/:id', deleteAppearance);
}

// Handler zwraca skład i statystyki zawodników dla jednego meczu.
async function getMatchAppearances({ res, params }: RouteContext): Promise<void> {
    const matchId = parseAppearanceMatchId(params.matchId);
    const appearances = await appearancesService.getMatchAppearances(matchId);

    sendJson(res, appearances);
}

// Handler tworzy występ i pozwala walidatorowi uzupełnić wartości domyślne.
async function createAppearance({ req, res, params }: RouteContext): Promise<void> {
    const matchId = parseAppearanceMatchId(params.matchId);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validateCreateAppearanceInput(body);
    const appearance = await appearancesService.createAppearance(matchId, input);

    res.setHeader('Location', `/api/v1/appearances/${appearance.id}`);
    sendJson(res, appearance, 201);
}

// Handler wymaga pełnego zestawu danych, ponieważ korzysta z metody PUT.
async function updateAppearance({ req, res, params }: RouteContext): Promise<void> {
    const id = parseAppearanceId(params.id);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validateUpdateAppearanceInput(body);
    const appearance = await appearancesService.updateAppearance(id, input);

    sendJson(res, appearance);
}

// Handler usuwa występ i zwraca odpowiedź bez treści.
async function deleteAppearance({ res, params }: RouteContext): Promise<void> {
    const id = parseAppearanceId(params.id);

    await appearancesService.deleteAppearance(id);

    sendNoContent(res);
}
