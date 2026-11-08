-- Reverts zero-filled counts on the 18 gap matches back to NULL. Their unflagged
-- fields were never recorded, so the 0s were placeholders from the zero step.
-- Only AM/ALL rows. Flagged fields are never touched.
-- Percentages are left as they are: they are only filled where a total is above 0,
-- and a reverted total is 0 by definition, so no percentage depends on it.

BEGIN;

UPDATE public.player_match_stats p
SET
  points = CASE WHEN p.points = 0 AND NOT COALESCE(u.points_unavailable, false) THEN NULL ELSE p.points END,
  block_points = CASE WHEN p.block_points = 0 AND NOT COALESCE(u.block_points_unavailable, false) THEN NULL ELSE p.block_points END,
  plus_minus = CASE WHEN p.plus_minus = 0 AND NOT COALESCE(u.plus_minus_unavailable, false) THEN NULL ELSE p.plus_minus END,
  break_points = CASE WHEN p.break_points = 0 AND NOT COALESCE(u.break_points_unavailable, false) THEN NULL ELSE p.break_points END,
  serve_total = CASE WHEN p.serve_total = 0 AND NOT COALESCE(u.serve_total_unavailable, false) THEN NULL ELSE p.serve_total END,
  serve_aces = CASE WHEN p.serve_aces = 0 AND NOT COALESCE(u.serve_aces_unavailable, false) THEN NULL ELSE p.serve_aces END,
  serve_errors = CASE WHEN p.serve_errors = 0 AND NOT COALESCE(u.serve_errors_unavailable, false) THEN NULL ELSE p.serve_errors END,
  reception_total = CASE WHEN p.reception_total = 0 AND NOT COALESCE(u.reception_total_unavailable, false) THEN NULL ELSE p.reception_total END,
  reception_errors = CASE WHEN p.reception_errors = 0 AND NOT COALESCE(u.reception_errors_unavailable, false) THEN NULL ELSE p.reception_errors END,
  attack_total = CASE WHEN p.attack_total = 0 AND NOT COALESCE(u.attack_total_unavailable, false) THEN NULL ELSE p.attack_total END,
  attack_errors = CASE WHEN p.attack_errors = 0 AND NOT COALESCE(u.attack_errors_unavailable, false) THEN NULL ELSE p.attack_errors END,
  attack_blocked = CASE WHEN p.attack_blocked = 0 AND NOT COALESCE(u.attack_blocked_unavailable, false) THEN NULL ELSE p.attack_blocked END,
  attack_kills = CASE WHEN p.attack_kills = 0 AND NOT COALESCE(u.attack_kills_unavailable, false) THEN NULL ELSE p.attack_kills END
FROM public.appearances a
LEFT JOIN public.match_unavailable_stats u ON u.match_id = a.match_id
WHERE p.appearance_id = a.appearance_id
  AND p.stats_version IN ('AM', 'ALL')
  AND a.match_id IN (145, 146, 147, 148, 149, 150, 165, 166, 167, 405, 406, 407, 408, 409, 410, 411, 437, 438);

COMMIT;
