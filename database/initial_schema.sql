BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clubs (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(120) NOT NULL,
    city varchar(120) NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT clubs_name_unique UNIQUE (name)
);


CREATE TABLE players (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    club_id integer NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
    first_name varchar(80) NOT NULL,
    last_name varchar(100) NOT NULL
);


CREATE TABLE matches (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    home_club_id integer NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
    away_club_id integer NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
    match_date timestamptz NOT NULL,
    home_score integer,
    away_score integer,

    CONSTRAINT matches_different_clubs_check CHECK (home_club_id <> away_club_id),
    CONSTRAINT matches_scores_check CHECK (
      (home_score IS NULL OR home_score >= 0)
      AND
      (away_score IS NULL OR away_score >= 0)
    )
);


CREATE TABLE match_appearances (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id integer NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id integer NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    minute_in integer NOT NULL DEFAULT 0,
    minute_out integer,
    yellow_cards integer NOT NULL DEFAULT 0,
    red_cards integer NOT NULL DEFAULT 0,
    fouls integer NOT NULL DEFAULT 0,

    CONSTRAINT match_appearances_unique_player UNIQUE (match_id, player_id),
    CONSTRAINT match_appearances_minutes_check CHECK (
      minute_in >= 0
      AND (minute_out IS NULL OR minute_out >= minute_in)
    ),
    CONSTRAINT match_appearances_cards_check CHECK (
      yellow_cards >= 0
      AND red_cards >= 0
      AND fouls >= 0
    )
);

CREATE TABLE goals (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id integer NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  scorer_id integer NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  assistant_id integer REFERENCES players(id) ON DELETE RESTRICT,
  minute integer NOT NULL,
  is_own_goal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT goals_minute_check CHECK (minute >= 0),
  CONSTRAINT goals_scorer_assistant_check CHECK (
    assistant_id IS NULL OR assistant_id <> scorer_id
  )
);

CREATE INDEX idx_players_club_id ON players(club_id);
CREATE INDEX idx_players_last_name ON players(last_name);

CREATE INDEX idx_matches_home_club_id ON matches(home_club_id);
CREATE INDEX idx_matches_away_club_id ON matches(away_club_id);
CREATE INDEX idx_matches_match_date ON matches(match_date);

CREATE INDEX idx_match_appearances_match_id ON match_appearances(match_id);
CREATE INDEX idx_match_appearances_player_id ON match_appearances(player_id);

CREATE INDEX idx_goals_match_id ON goals(match_id);
CREATE INDEX idx_goals_scorer_id ON goals(scorer_id);
CREATE INDEX idx_goals_assistant_id ON goals(assistant_id);

INSERT INTO schema_migrations (id)
VALUES ('initial_schema')
ON CONFLICT (id) DO NOTHING;

COMMIT;
