-- Percentages and ratios in match_team_totals become numeric(5,2) (same as
-- player_match_stats). Derived columns become STORED generated columns so they
-- stay in sync when their inputs change.

-- Derived columns must be dropped before their input column types change.
ALTER TABLE public.match_team_totals
  DROP COLUMN IF EXISTS reception_positive,
  DROP COLUMN IF EXISTS reception_excellent,
  DROP COLUMN IF EXISTS serve_error_pct,
  DROP COLUMN IF EXISTS serve_ace_pct,
  DROP COLUMN IF EXISTS errors_per_ace,
  DROP COLUMN IF EXISTS reception_error_pct,
  DROP COLUMN IF EXISTS attack_efficiency;

-- Stored percentages entered directly (from import or manual entry).
ALTER TABLE public.match_team_totals
  ALTER COLUMN reception_positive_pct TYPE numeric(5,2),
  ALTER COLUMN reception_excellent_pct TYPE numeric(5,2),
  ALTER COLUMN attack_kill_pct TYPE numeric(5,2);

-- Derived columns, recalculated automatically whenever their inputs change.
ALTER TABLE public.match_team_totals
  ADD COLUMN reception_positive integer GENERATED ALWAYS AS (
    round((reception_total * reception_positive_pct) / 100.0)::integer
  ) STORED,
  ADD COLUMN reception_excellent integer GENERATED ALWAYS AS (
    round((reception_total * reception_excellent_pct) / 100.0)::integer
  ) STORED,
  ADD COLUMN serve_error_pct numeric(5,2) GENERATED ALWAYS AS (
    round(100.0 * serve_errors / NULLIF(serve_total, 0), 2)
  ) STORED,
  ADD COLUMN serve_ace_pct numeric(5,2) GENERATED ALWAYS AS (
    round(100.0 * serve_aces / NULLIF(serve_total, 0), 2)
  ) STORED,
  ADD COLUMN errors_per_ace numeric(5,2) GENERATED ALWAYS AS (
    round(serve_errors::numeric / NULLIF(serve_aces, 0), 2)
  ) STORED,
  ADD COLUMN reception_error_pct numeric(5,2) GENERATED ALWAYS AS (
    round(100.0 * reception_errors / NULLIF(reception_total, 0), 2)
  ) STORED,
  ADD COLUMN attack_efficiency numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN attack_total > 0 THEN round(
        100.0 * (attack_kills - attack_errors - attack_blocked)::numeric / attack_total,
        2
      )
    END
  ) STORED;
