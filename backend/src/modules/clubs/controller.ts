import { env } from '../../config/env.js';
import { readJsonBody, sendJson, sendNoContent } from '../../http/json.js';
import type { RouteContext, Router } from '../../http/router.js';

import { ClubsRepository } from './repository.js';
import { ClubsService } from './service.js';
import { parseClubId, validateClubInput } from './validation.js';

// Kontroler tworzy jedną instancję repozytorium i przekazuje ją do serwisu.
// Ponowne użycie tych instancji jest wystarczające, ponieważ nie przechowują stanu pojedynczego żądania.
const clubsRepository = new ClubsRepository();
const clubsService = new ClubsService(clubsRepository);

// Funkcja rejestruje publiczne endpointy modułu w głównym routerze aplikacji.
// Utrzymuje definicje tras obok kontrolera, dzięki czemu server.ts nie zna szczegółów modułu.
export function registerClubRoutes(router: Router): void {
    router.get('/api/v1/clubs', getClubs);
    router.get('/api/v1/clubs/:id', getClub);
    router.post('/api/v1/clubs', createClub);
    router.put('/api/v1/clubs/:id', updateClub);
    router.delete('/api/v1/clubs/:id', deleteClub);

    router.get('/api/v1/clubs/:id/players', getClubPlayers);
}

// Handler pobiera listę klubów przez serwis i serializuje ją do odpowiedzi JSON ze statusem 200.
async function getClubs({ res }: RouteContext): Promise<void> {
    const clubs = await clubsService.getClubs();

    sendJson(res, clubs);
}

// Handler waliduje identyfikator z adresu przed przekazaniem go do warstwy biznesowej.
async function getClub({ res, params }: RouteContext): Promise<void> {
    const id = parseClubId(params.id);
    const club = await clubsService.getClub(id);

    sendJson(res, club);
}

// Handler odczytuje JSON z limitem rozmiaru, waliduje dane i tworzy nowy klub.
// Limit chroni proces przed przyjęciem zbyt dużego body, zanim dane trafią do serwisu.
async function createClub({ req, res }: RouteContext): Promise<void> {
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);

    const input = validateClubInput(body);
    const club = await clubsService.createClub(input);

    // Nagłówek Location wskazuje adres nowo utworzonego zasobu zgodnie z semantyką odpowiedzi 201.
    res.setHeader('Location', `/api/v1/clubs/${club.id}`);

    sendJson(res, club, 201);
}

// Handler realizuje pełną aktualizację PUT, dlatego wymaga zarówno nazwy, jak i miasta.
async function updateClub({ req, res, params }: RouteContext): Promise<void> {
    const id = parseClubId(params.id);
    const body = await readJsonBody(req, env.BODY_LIMIT_BYTES);

    const input = validateClubInput(body);
    const club = await clubsService.updateClub(id, input);

    sendJson(res, club);
}

// Handler usuwa klub i zwraca 204, ponieważ po poprawnym DELETE odpowiedź nie zawiera body.
async function deleteClub({ res, params }: RouteContext): Promise<void> {
    const id = parseClubId(params.id);

    await clubsService.deleteClub(id);

    sendNoContent(res);
}

// Handler zwraca zawodników wskazanego klubu albo pozwala serwisowi zgłosić błąd 404.
async function getClubPlayers({ res, params }: RouteContext): Promise<void> {
    const id = parseClubId(params.id);
    const players = await clubsService.getClubPlayers(id);

    sendJson(res, players);
}
