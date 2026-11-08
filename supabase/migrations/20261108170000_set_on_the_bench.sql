-- Sets appearances.on_the_bench from the set positions. A player with no set position
-- on any stats row stayed on the bench. Only appearances with an AM or ALL row are
-- updated; appearances with only a NULL-version placeholder are left as they are.

BEGIN;

UPDATE public.appearances a
SET on_the_bench = NOT EXISTS (
  SELECT 1
  FROM public.player_match_stats p
  WHERE p.appearance_id = a.appearance_id
    AND (
      p.set1_position IS NOT NULL OR p.set2_position IS NOT NULL OR p.set3_position IS NOT NULL
      OR p.set4_position IS NOT NULL OR p.set5_position IS NOT NULL OR p.set6_position IS NOT NULL
    )
)
WHERE EXISTS (
  SELECT 1
  FROM public.player_match_stats v
  WHERE v.appearance_id = a.appearance_id
    AND v.stats_version IS NOT NULL
);

COMMIT;
