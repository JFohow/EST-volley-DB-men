-- Hides the stats_version NULL placeholder row when the same appearance has a
-- versioned (AM/ALL) row, so each appearance shows only its real stats rows.

CREATE OR REPLACE VIEW public.match_stats_view
WITH (security_invoker = true) AS
SELECT
  m.match_id,
  m.match_date,
  m.opponent,
  m.opponent_en,
  m.vm,
  m.am,
  m.mam,
  m.has_additional_sets,
  m.additional_sets_count,
  m.estonia_sets,
  m.opponent_sets,
  m.technical_result,
  pl.player_id,
  pl.first_name,
  pl.last_name,
  a.appearance_id,
  a.sets_started,
  a.on_the_bench,
  p.stat_id,
  p.stats_version,
  p.set1_position,
  p.set2_position,
  p.set3_position,
  p.set4_position,
  p.set5_position,
  p.set6_position,
  p.points,
  p.block_points,
  p.plus_minus,
  p.break_points,
  p.serve_total,
  p.serve_aces,
  p.serve_errors,
  p.reception_total,
  p.reception_errors,
  p.reception_positive_pct,
  p.reception_excellent_pct,
  p.attack_total,
  p.attack_errors,
  p.attack_blocked,
  p.attack_kills,
  p.attack_kill_pct,
  p.attack_efficiency,
  u.points_unavailable,
  u.block_points_unavailable,
  u.plus_minus_unavailable,
  u.break_points_unavailable,
  u.serve_total_unavailable,
  u.serve_aces_unavailable,
  u.serve_errors_unavailable,
  u.reception_total_unavailable,
  u.reception_errors_unavailable,
  u.reception_positive_pct_unavailable,
  u.reception_excellent_pct_unavailable,
  u.attack_total_unavailable,
  u.attack_errors_unavailable,
  u.attack_blocked_unavailable,
  u.attack_kills_unavailable
FROM public.matches m
JOIN public.appearances a ON a.match_id = m.match_id
JOIN public.players pl ON pl.player_id = a.player_id
LEFT JOIN public.player_match_stats p ON p.appearance_id = a.appearance_id
LEFT JOIN public.match_unavailable_stats u ON u.match_id = m.match_id
WHERE p.stat_id IS NULL
  OR p.stats_version IS NOT NULL
  OR NOT EXISTS (
    SELECT 1
    FROM public.player_match_stats v
    WHERE v.appearance_id = a.appearance_id
      AND v.stats_version IS NOT NULL
  );
