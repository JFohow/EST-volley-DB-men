-- Zero step. Run before 20261108120000_fill_percentage_stats.sql.
-- Only AM/ALL rows. A NULL count becomes 0 only when the field is not flagged
-- in match_unavailable_stats. Flagged fields are never touched.

BEGIN;

UPDATE public.player_match_stats p
SET
  points = CASE WHEN p.points IS NULL AND NOT COALESCE(u.points_unavailable, false) THEN 0 ELSE p.points END,
  block_points = CASE WHEN p.block_points IS NULL AND NOT COALESCE(u.block_points_unavailable, false) THEN 0 ELSE p.block_points END,
  plus_minus = CASE WHEN p.plus_minus IS NULL AND NOT COALESCE(u.plus_minus_unavailable, false) THEN 0 ELSE p.plus_minus END,
  break_points = CASE WHEN p.break_points IS NULL AND NOT COALESCE(u.break_points_unavailable, false) THEN 0 ELSE p.break_points END,
  serve_total = CASE WHEN p.serve_total IS NULL AND NOT COALESCE(u.serve_total_unavailable, false) THEN 0 ELSE p.serve_total END,
  serve_aces = CASE WHEN p.serve_aces IS NULL AND NOT COALESCE(u.serve_aces_unavailable, false) THEN 0 ELSE p.serve_aces END,
  serve_errors = CASE WHEN p.serve_errors IS NULL AND NOT COALESCE(u.serve_errors_unavailable, false) THEN 0 ELSE p.serve_errors END,
  reception_total = CASE WHEN p.reception_total IS NULL AND NOT COALESCE(u.reception_total_unavailable, false) THEN 0 ELSE p.reception_total END,
  reception_errors = CASE WHEN p.reception_errors IS NULL AND NOT COALESCE(u.reception_errors_unavailable, false) THEN 0 ELSE p.reception_errors END,
  attack_total = CASE WHEN p.attack_total IS NULL AND NOT COALESCE(u.attack_total_unavailable, false) THEN 0 ELSE p.attack_total END,
  attack_errors = CASE WHEN p.attack_errors IS NULL AND NOT COALESCE(u.attack_errors_unavailable, false) THEN 0 ELSE p.attack_errors END,
  attack_blocked = CASE WHEN p.attack_blocked IS NULL AND NOT COALESCE(u.attack_blocked_unavailable, false) THEN 0 ELSE p.attack_blocked END,
  attack_kills = CASE WHEN p.attack_kills IS NULL AND NOT COALESCE(u.attack_kills_unavailable, false) THEN 0 ELSE p.attack_kills END
FROM public.appearances a
LEFT JOIN public.match_unavailable_stats u ON u.match_id = a.match_id
WHERE p.appearance_id = a.appearance_id
  AND p.stats_version IN ('AM', 'ALL');

COMMIT;
