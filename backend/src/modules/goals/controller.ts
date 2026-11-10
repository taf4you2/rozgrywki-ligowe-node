import { env } from '../../config/env.js';
import { readJsonBody, sendJson, sendNoContent } from '../../http/json.js';
import type { RouteContext, Router } from '../../http/router.js';

import { GoalsRepository } from './repository.js';
import { GoalsService } from './service.js';
import {
    parseGoalId,
    parseGoalMatchId,
    validateCreateGoalInput,
    validateUpdateGoalInput,
} from './validation.js';

// Kontroler tworzy obiekty modułu bramek używane przez zarejestrowane trasy.
const goalsRepository = new GoalsRepository();
const goalsService = new GoalsService(goalsRepository);

// Funkcja rejestruje endpointy bramek w routerze aplikacji.
export function registerGoalRoutes(router: Router): void {
    router.get('/api/v1/matches/:matchId/goals', getMatchGoals);
    router.post('/api/v1/matches/:matchId/goals', createGoal);
    router.put('/api/v1/goals/:id', updateGoal);
    router.delete('/api/v1/goals/:id', deleteGoal);
}

// Handler zwraca bramki przypisane do wskazanego meczu.
async function getMatchGoals({ res, params }: RouteContext): Promise<void> {
    const matchId = parseGoalMatchId(params.matchId);
    const goals = await goalsService.getMatchGoals(matchId);

    sendJson(res, goals);
}

// Handler tworzy bramkę i zwraca jej adres w nagłówku Location.
async function createGoal({ req, res, params }: RouteContext): Promise<void> {
    const matchId = parseGoalMatchId(params.matchId);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validateCreateGoalInput(body);
    const goal = await goalsService.createGoal(matchId, input);

    res.setHeader('Location', `/api/v1/goals/${goal.id}`);
    sendJson(res, goal, 201);
}

// Handler wykonuje pełną aktualizację istniejącej bramki.
async function updateGoal({ req, res, params }: RouteContext): Promise<void> {
    const id = parseGoalId(params.id);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);
    const input = validateUpdateGoalInput(body);
    const goal = await goalsService.updateGoal(id, input);

    sendJson(res, goal);
}

// Handler usuwa bramkę i zwraca pustą odpowiedź 204.
async function deleteGoal({ res, params }: RouteContext): Promise<void> {
    const id = parseGoalId(params.id);

    await goalsService.deleteGoal(id);

    sendNoContent(res);
}
