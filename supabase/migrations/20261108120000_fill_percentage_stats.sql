-- Percentage step. Run after 20261108110000_fill_zero_stats.sql.
-- Only AM/ALL rows. Flagged fields are never touched.
--   reception_*_pct: total > 0 and pct NULL -> 0 (a recorded total with no pct means 0%).
--   attack_kill_pct / attack_efficiency: computed from the counts when total > 0.
--   Where a total is 0 or NULL, the percentage stays NULL (the UI shows it blank).

BEGIN;

UPDATE public.player_match_stats p
SET
  reception_positive_pct = CASE
    WHEN p.reception_positive_pct IS NULL
      AND p.reception_total > 0
      AND NOT COALESCE(u.reception_total_unavailable, false)
      AND NOT COALESCE(u.reception_positive_pct_unavailable, false)
    THEN 0
    ELSE p.reception_positive_pct
  END,
  reception_excellent_pct = CASE
    WHEN p.reception_excellent_pct IS NULL
      AND p.reception_total > 0
      AND NOT COALESCE(u.reception_total_unavailable, false)
      AND NOT COALESCE(u.reception_excellent_pct_unavailable, false)
    THEN 0
    ELSE p.reception_excellent_pct
  END,
  attack_kill_pct = CASE
    WHEN p.attack_kill_pct IS NULL
      AND p.attack_total > 0
      AND NOT COALESCE(u.attack_total_unavailable, false)
      AND NOT COALESCE(u.attack_kills_unavailable, false)
    THEN ROUND(p.attack_kills::numeric / p.attack_total * 100, 2)
    ELSE p.attack_kill_pct
  END,
  attack_efficiency = CASE
    WHEN p.attack_efficiency IS NULL
      AND p.attack_total > 0
      AND NOT COALESCE(u.attack_total_unavailable, false)
      AND NOT COALESCE(u.attack_kills_unavailable, false)
      AND NOT COALESCE(u.attack_blocked_unavailable, false)
      AND NOT COALESCE(u.attack_errors_unavailable, false)
    THEN ROUND(
      (p.attack_kills - COALESCE(p.attack_blocked, 0) - COALESCE(p.attack_errors, 0))::numeric
      / p.attack_total * 100,
      2
    )
    ELSE p.attack_efficiency
  END
FROM public.appearances a
LEFT JOIN public.match_unavailable_stats u ON u.match_id = a.match_id
WHERE p.appearance_id = a.appearance_id
  AND p.stats_version IN ('AM', 'ALL');

COMMIT;
