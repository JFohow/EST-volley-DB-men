ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS technical_result BOOLEAN NOT NULL DEFAULT false;

UPDATE public.matches
SET technical_result = true
WHERE match_id IN (187, 519);

CREATE OR REPLACE VIEW public.match_data_gaps
WITH (security_invoker = true) AS
WITH set_counts AS (
  SELECT
    match_id,
    count(*) FILTER (WHERE set_number BETWEEN 1 AND 5) AS official_set_rows,
    count(*) FILTER (WHERE set_number BETWEEN 6 AND 8) AS additional_set_rows
  FROM public.match_sets
  GROUP BY match_id
),
stat_counts AS (
  SELECT
    a.match_id,
    count(*) FILTER (WHERE p.stats_version = 'AM') AS am_stat_rows,
    count(*) FILTER (WHERE p.stats_version = 'ALL') AS all_stat_rows
  FROM public.appearances a
  JOIN public.player_match_stats p ON p.appearance_id = a.appearance_id
  GROUP BY a.match_id
)
SELECT
  m.match_id,
  m.match_date,
  m.opponent,
  m.estonia_sets,
  m.opponent_sets,
  (m.estonia_sets IS NULL OR m.opponent_sets IS NULL) AS missing_match_score,
  m.estonia_sets + m.opponent_sets - COALESCE(s.official_set_rows, 0) AS missing_official_set_scores,
  m.additional_sets_count,
  m.additional_sets_count - COALESCE(s.additional_set_rows, 0) AS missing_additional_set_scores,
  COALESCE(st.am_stat_rows, 0) AS am_stat_rows,
  COALESCE(st.all_stat_rows, 0) AS all_stat_rows,
  m.technical_result
FROM public.matches m
LEFT JOIN set_counts s ON s.match_id = m.match_id
LEFT JOIN stat_counts st ON st.match_id = m.match_id;

GRANT SELECT ON public.match_data_gaps TO authenticated;
