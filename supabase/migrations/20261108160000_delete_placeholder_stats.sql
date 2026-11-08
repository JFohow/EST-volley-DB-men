-- Deletes placeholder rows in player_match_stats: stats_version NULL rows with no
-- stats values. These were created when appearances were added, before the real
-- stats were entered. Appearances are kept, so rosters are unchanged.

BEGIN;

DELETE FROM public.player_match_stats p
WHERE p.stats_version IS NULL
  AND NOT (
    p.points IS NOT NULL OR p.block_points IS NOT NULL OR p.plus_minus IS NOT NULL
    OR p.break_points IS NOT NULL OR p.serve_total IS NOT NULL OR p.serve_aces IS NOT NULL
    OR p.serve_errors IS NOT NULL OR p.reception_total IS NOT NULL OR p.reception_errors IS NOT NULL
    OR p.reception_positive_pct IS NOT NULL OR p.reception_excellent_pct IS NOT NULL
    OR p.attack_total IS NOT NULL OR p.attack_errors IS NOT NULL OR p.attack_blocked IS NOT NULL
    OR p.attack_kills IS NOT NULL
  );

COMMIT;
