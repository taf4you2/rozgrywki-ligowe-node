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

INSERT INTO matches (
    home_club_id,
    away_club_id,
    match_date,
    first_half_duration_minutes,
    second_half_duration_minutes,
    extra_time_first_half_duration_minutes,
    extra_time_second_half_duration_minutes,
    home_score,
    away_score
)
SELECT
    home_club.id,
    away_club.id,
    v.match_date::timestamptz,
    v.first_half_duration_minutes,
    v.second_half_duration_minutes,
    v.extra_time_first_half_duration_minutes,
    v.extra_time_second_half_duration_minutes,
    v.home_score,
    v.away_score
FROM (
    VALUES
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 45, 45, 0, 0, 2, 1),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 45, 45, 0, 0, 0, 0),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 45, 45, 0, 0, 3, 2),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 45, 45, 0, 0, 1, 2),
        ('Stal Poznan', 'Orly Warszawa', '2026-08-30 18:30:00+02', 45, 45, 0, 0, NULL, NULL)
) AS v(
    home_club_name,
    away_club_name,
    match_date,
    first_half_duration_minutes,
    second_half_duration_minutes,
    extra_time_first_half_duration_minutes,
    extra_time_second_half_duration_minutes,
    home_score,
    away_score
)
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
    time_code_in,
    time_code_out,
    yellow_cards,
    red_cards,
    fouls
)
SELECT m.id, p.id, v.time_code_in, v.time_code_out, v.yellow_cards, v.red_cards, v.fouls
FROM (
    VALUES
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Jan', 'Kowalski', 0, 1045, 0, 0, 2),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Piotr', 'Nowak', 0, 1045, 1, 0, 3),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Michal', 'Wisniewski', 0, 1045, 0, 0, 1),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Pawel', 'Kaminski', 0, 1045, 1, 0, 4),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Marcin', 'Wojcik', 0, 1045, 0, 0, 1),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Kamil', 'Szymanski', 0, 1030, 0, 0, 2),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Jakub', 'Mazur', 0, 1045, 0, 0, 2),
        ('Portowcy Gdansk', 'Stal Poznan', '2026-08-16 17:30:00+02', 'Daniel', 'Lis', 1015, 1045, 1, 0, 3),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Adam', 'Majewski', 0, 1045, 0, 0, 2),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Tomasz', 'Kaczmarek', 0, 1035, 0, 0, 1),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Robert', 'Dabrowski', 0, 1045, 1, 0, 5),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Mateusz', 'Krol', 1010, 1045, 0, 0, 2),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Karol', 'Lewandowski', 0, 1045, 0, 0, 2),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Lukasz', 'Zielinski', 0, 1045, 0, 1, 3),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Patryk', 'Grabowski', 0, 1045, 1, 0, 4),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Bartosz', 'Pawlak', 0, 1045, 0, 0, 1)
) AS v(
    home_club_name,
    away_club_name,
    match_date,
    first_name,
    last_name,
    time_code_in,
    time_code_out,
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

INSERT INTO goals (match_id, scorer_id, assistant_id, time_code, is_own_goal)
SELECT m.id, scorer.id, assistant.id, v.time_code, v.is_own_goal
FROM (
    VALUES
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Jan', 'Kowalski', 'Piotr', 'Nowak', 23, false),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Jan', 'Kowalski', NULL, NULL, 1026, false),
        ('Orly Warszawa', 'Wicher Krakow', '2026-08-15 18:00:00+02', 'Pawel', 'Kaminski', NULL, NULL, 1039, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Adam', 'Majewski', 'Tomasz', 'Kaczmarek', 12, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Tomasz', 'Kaczmarek', NULL, NULL, 39, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Robert', 'Dabrowski', 'Mateusz', 'Krol', 1013, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Mateusz', 'Krol', NULL, NULL, 1032, false),
        ('Orly Warszawa', 'Portowcy Gdansk', '2026-08-22 19:00:00+02', 'Adam', 'Majewski', NULL, NULL, 1043, false),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Karol', 'Lewandowski', NULL, NULL, 34, false),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Patryk', 'Grabowski', 'Bartosz', 'Pawlak', 1016, false),
        ('Wicher Krakow', 'Stal Poznan', '2026-08-23 16:00:00+02', 'Bartosz', 'Pawlak', NULL, NULL, 1034, false)
) AS v(
    home_club_name,
    away_club_name,
    match_date,
    scorer_first_name,
    scorer_last_name,
    assistant_first_name,
    assistant_last_name,
    time_code,
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
      AND g.time_code = v.time_code
      AND g.is_own_goal = v.is_own_goal
);

COMMIT;
