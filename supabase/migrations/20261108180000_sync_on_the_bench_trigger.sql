-- Keeps appearances.on_the_bench in step with player_match_stats. When a stats row
-- changes, the appearance's on_the_bench is recalculated from its set positions.
-- Appearances with no AM or ALL row are left as they are.

CREATE OR REPLACE FUNCTION public.sync_on_the_bench()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_appearance_id bigint := COALESCE(NEW.appearance_id, OLD.appearance_id);
BEGIN
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
  WHERE a.appearance_id = target_appearance_id
    AND EXISTS (
      SELECT 1
      FROM public.player_match_stats v
      WHERE v.appearance_id = target_appearance_id
        AND v.stats_version IS NOT NULL
    );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS player_match_stats_sync_on_the_bench ON public.player_match_stats;

CREATE TRIGGER player_match_stats_sync_on_the_bench
AFTER INSERT OR UPDATE OF set1_position, set2_position, set3_position, set4_position,
  set5_position, set6_position, stats_version
OR DELETE ON public.player_match_stats
FOR EACH ROW
EXECUTE FUNCTION public.sync_on_the_bench();
