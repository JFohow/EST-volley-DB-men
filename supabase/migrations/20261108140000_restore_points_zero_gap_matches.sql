-- Restores points = 0 on AM/ALL rows of the 18 gap matches where points is NULL
-- and not flagged. The earlier revert nulled these, but for partial-stats matches
-- a 0 points value is correct.

BEGIN;

UPDATE public.player_match_stats p
SET points = 0
FROM public.appearances a
LEFT JOIN public.match_unavailable_stats u ON u.match_id = a.match_id
WHERE p.appearance_id = a.appearance_id
  AND p.stats_version IN ('AM', 'ALL')
  AND p.points IS NULL
  AND NOT COALESCE(u.points_unavailable, false)
  AND a.match_id IN (145, 146, 147, 148, 149, 150, 165, 166, 167, 405, 406, 407, 408, 409, 410, 411, 437, 438);

COMMIT;
