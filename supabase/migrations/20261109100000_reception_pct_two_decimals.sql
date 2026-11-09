-- Limit reception_error_pct, reception_negative_pct and reception_efficiency to two decimals.
-- Generated columns cannot change expression in place, so they are dropped and re-added.
-- Run by hand in the Supabase SQL editor on production.

ALTER TABLE public.player_match_stats
  DROP COLUMN IF EXISTS reception_error_pct,
  DROP COLUMN IF EXISTS reception_negative_pct,
  DROP COLUMN IF EXISTS reception_efficiency;

ALTER TABLE public.player_match_stats
  ADD COLUMN reception_error_pct numeric(5,2)
    GENERATED ALWAYS AS (
      round(reception_errors::numeric / NULLIF(reception_total, 0) * 100, 2)
    ) STORED,
  ADD COLUMN reception_negative_pct numeric(5,2)
    GENERATED ALWAYS AS (
      round(
        (reception_total - reception_errors
         - round(reception_total * reception_positive_pct / 100.0))::numeric
        / NULLIF(reception_total, 0) * 100
      , 2)
    ) STORED,
  ADD COLUMN reception_efficiency numeric(5,2)
    GENERATED ALWAYS AS (
      round(
        (round(reception_total * reception_excellent_pct / 100.0) - reception_errors)::numeric
        / NULLIF(reception_total, 0) * 100
      , 2)
    ) STORED;
