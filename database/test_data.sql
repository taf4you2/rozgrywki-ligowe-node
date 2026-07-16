BEGIN;

INSERT INTO clubs (name, city)
VALUES
    ('Orly Warszawa', 'Warszawa'),
    ('Wicher Krakow', 'Krakow'),
    ('Portowcy Gdansk', 'Gdansk'),
    ('Stal Poznan', 'Poznan')
ON CONFLICT (name) DO NOTHING;

INSERT INTO players (club_id, first_name, last_name)
SELECT c.id, v.first_name, v.last_name
FROM (
    VALUES
        ('Orly Warszawa', 'Jan', 'Kowalski'),
        ('Orly Warszawa', 'Piotr', 'Nowak'),
        ('Orly Warszawa', 'Adam', 'Majewski'),
        ('Orly Warszawa', 'Tomasz', 'Kaczmarek'),
        ('Wicher Krakow', 'Michal', 'Wisniewski'),
        ('Wicher Krakow', 'Pawel', 'Kaminski'),
        ('Wicher Krakow', 'Karol', 'Lewandowski'),
        ('Wicher Krakow', 'Lukasz', 'Zielinski'),
        ('Portowcy Gdansk', 'Marcin', 'Wojcik'),
        ('Portowcy Gdansk', 'Kamil', 'Szymanski'),
        ('Portowcy Gdansk', 'Robert', 'Dabrowski'),
        ('Portowcy Gdansk', 'Mateusz', 'Krol'),
        ('Stal Poznan', 'Jakub', 'Mazur'),
        ('Stal Poznan', 'Daniel', 'Lis'),
        ('Stal Poznan', 'Patryk', 'Grabowski'),
        ('Stal Poznan', 'Bartosz', 'Pawlak')
) AS v(club_name, first_name, last_name)
JOIN clubs c ON c.name = v.club_name
WHERE NOT EXISTS (
    SELECT 1
    FROM players p
    WHERE p.club_id = c.id
      AND p.first_name = v.first_name
      AND p.last_name = v.last_name
);

INSERT INTO matches (home_club_id, away_club_id, match_date, home_score, away_score)
SELECT home_club.id, away_club.id, v.match_date::timestamptz, v.home_score, v.away_score
FROM (
    VALUES
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 2, 1),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 0, 0),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 3, 2),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 1, 2),
        ('Stal Poznan', 'Orly Warszawa', '2026-08-30 18:30:00+02', NULL, NULL)
) AS v(home_club_name, away_club_name, match_date, home_score, away_score)
JOIN clubs home_club ON home_club.name = v.home_club_name
JOIN clubs away_club ON away_club.name = v.away_club_name
WHERE NOT EXISTS (
    SELECT 1
    FROM matches m
    WHERE m.home_club_id = home_club.id
      AND m.away_club_id = away_club.id
      AND m.match_date = v.match_date::timestamptz
);

INSERT INTO match_appearances (
    match_id,
    player_id,
    minute_in,
    minute_out,
    yellow_cards,
    red_cards,
    fouls
)
SELECT m.id, p.id, v.minute_in, v.minute_out, v.yellow_cards, v.red_cards, v.fouls
FROM (
    VALUES
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Jan', 'Kowalski', 0, 90, 0, 0, 2),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Piotr', 'Nowak', 0, 90, 1, 0, 3),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Michal', 'Wisniewski', 0, 90, 0, 0, 1),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Pawel', 'Kaminski', 0, 90, 1, 0, 4),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Marcin', 'Wojcik', 0, 90, 0, 0, 1),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Kamil', 'Szymanski', 0, 75, 0, 0, 2),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Jakub', 'Mazur', 0, 90, 0, 0, 2),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Daniel', 'Lis', 15, 90, 1, 0, 3),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Adam', 'Majewski', 0, 90, 0, 0, 2),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Tomasz', 'Kaczmarek', 0, 80, 0, 0, 1),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Robert', 'Dabrowski', 0, 90, 1, 0, 5),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Mateusz', 'Krol', 10, 90, 0, 0, 2),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Karol', 'Lewandowski', 0, 90, 0, 0, 2),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Lukasz', 'Zielinski', 0, 90, 0, 1, 3),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Patryk', 'Grabowski', 0, 90, 1, 0, 4),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Bartosz', 'Pawlak', 0, 90, 0, 0, 1)
) AS v(
    home_club_name,
    away_club_name,
    match_date,
    first_name,
    last_name,
    minute_in,
    minute_out,
    yellow_cards,
    red_cards,
    fouls
)
JOIN clubs home_club ON home_club.name = v.home_club_name
JOIN clubs away_club ON away_club.name = v.away_club_name
JOIN matches m ON m.home_club_id = home_club.id
    AND m.away_club_id = away_club.id
    AND m.match_date = v.match_date::timestamptz
JOIN players p ON p.first_name = v.first_name
    AND p.last_name = v.last_name
ON CONFLICT (match_id, player_id) DO NOTHING;

INSERT INTO goals (match_id, scorer_id, assistant_id, minute, is_own_goal)
SELECT m.id, scorer.id, assistant.id, v.minute, v.is_own_goal
FROM (
    VALUES
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Jan', 'Kowalski', 'Piotr', 'Nowak', 23, false),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Jan', 'Kowalski', NULL, NULL, 71, false),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Pawel', 'Kaminski', NULL, NULL, 84, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Adam', 'Majewski', 'Tomasz', 'Kaczmarek', 12, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Tomasz', 'Kaczmarek', NULL, NULL, 39, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Robert', 'Dabrowski', 'Mateusz', 'Krol', 58, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Mateusz', 'Krol', NULL, NULL, 77, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Adam', 'Majewski', NULL, NULL, 88, false),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Karol', 'Lewandowski', NULL, NULL, 34, false),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Patryk', 'Grabowski', 'Bartosz', 'Pawlak', 61, false),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Bartosz', 'Pawlak', NULL, NULL, 79, false)
) AS v(
    home_club_name,
    away_club_name,
    match_date,
    scorer_first_name,
    scorer_last_name,
    assistant_first_name,
    assistant_last_name,
    minute,
    is_own_goal
)
JOIN clubs home_club ON home_club.name = v.home_club_name
JOIN clubs away_club ON away_club.name = v.away_club_name
JOIN matches m ON m.home_club_id = home_club.id
    AND m.away_club_id = away_club.id
    AND m.match_date = v.match_date::timestamptz
JOIN players scorer ON scorer.first_name = v.scorer_first_name
    AND scorer.last_name = v.scorer_last_name
LEFT JOIN players assistant ON assistant.first_name = v.assistant_first_name
    AND assistant.last_name = v.assistant_last_name
WHERE NOT EXISTS (
    SELECT 1
    FROM goals g
    WHERE g.match_id = m.id
      AND g.scorer_id = scorer.id
      AND g.assistant_id IS NOT DISTINCT FROM assistant.id
      AND g.minute = v.minute
      AND g.is_own_goal = v.is_own_goal
);

COMMIT;
