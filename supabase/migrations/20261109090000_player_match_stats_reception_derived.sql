-- Derived reception columns on player_match_stats.
-- Counts are rounded to whole numbers; percentages are computed from the exact error count.
-- Run by hand in the Supabase SQL editor on production.

ALTER TABLE public.player_match_stats
  ADD COLUMN IF NOT EXISTS reception_positive integer
    GENERATED ALWAYS AS (round(reception_total * reception_positive_pct / 100.0)::integer) STORED,
  ADD COLUMN IF NOT EXISTS reception_excellent integer
    GENERATED ALWAYS AS (round(reception_total * reception_excellent_pct / 100.0)::integer) STORED,
  ADD COLUMN IF NOT EXISTS reception_negative integer
    GENERATED ALWAYS AS (
      reception_total - reception_errors
      - round(reception_total * reception_positive_pct / 100.0)::integer
    ) STORED,
  ADD COLUMN IF NOT EXISTS reception_error_pct numeric
    GENERATED ALWAYS AS (reception_errors::numeric / NULLIF(reception_total, 0) * 100) STORED,
  ADD COLUMN IF NOT EXISTS reception_negative_pct numeric
    GENERATED ALWAYS AS (
      (reception_total - reception_errors
       - round(reception_total * reception_positive_pct / 100.0))::numeric
      / NULLIF(reception_total, 0) * 100
    ) STORED,
  ADD COLUMN IF NOT EXISTS reception_efficiency numeric
    GENERATED ALWAYS AS (
      (round(reception_total * reception_excellent_pct / 100.0) - reception_errors)::numeric
      / NULLIF(reception_total, 0) * 100
    ) STORED;
