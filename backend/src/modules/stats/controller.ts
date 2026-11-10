import { sendJson } from '../../http/json.js';
import type { RouteContext, Router } from '../../http/router.js';

import { StatsRepository } from './repository.js';
import { StatsService } from './service.js';
import { parseStatsLimit } from './validation.js';

// Kontroler tworzy jedną instancję warstw modułu statystyk.
const statsRepository = new StatsRepository();
const statsService = new StatsService(statsRepository);

// Funkcja rejestruje trzy publiczne rankingi.
export function registerStatsRoutes(router: Router): void {
    router.get('/api/v1/stats/top-scorers', getTopScorers);
    router.get('/api/v1/stats/cards', getCards);
    router.get('/api/v1/stats/appearances', getAppearances);
}

// Handler sprawdza limit i zwraca najlepszych strzelców.
async function getTopScorers({ res, query }: RouteContext): Promise<void> {
    const limit = parseStatsLimit(query);
    const stats = await statsService.getTopScorers(limit);

    sendJson(res, stats);
}

// Handler sprawdza limit i zwraca ranking kartek.
async function getCards({ res, query }: RouteContext): Promise<void> {
    const limit = parseStatsLimit(query);
    const stats = await statsService.getCards(limit);

    sendJson(res, stats);
}

// Handler sprawdza limit i zwraca ranking występów.
async function getAppearances({ res, query }: RouteContext): Promise<void> {
    const limit = parseStatsLimit(query);
    const stats = await statsService.getAppearances(limit);

    sendJson(res, stats);
}
