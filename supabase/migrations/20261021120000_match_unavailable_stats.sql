CREATE TABLE IF NOT EXISTS public.match_unavailable_stats (
  match_id BIGINT NOT NULL REFERENCES public.matches(match_id) ON DELETE CASCADE,
  stat_field TEXT NOT NULL,
  CONSTRAINT match_unavailable_stats_pkey PRIMARY KEY (match_id, stat_field)
);

ALTER TABLE public.match_unavailable_stats
  DROP CONSTRAINT IF EXISTS match_unavailable_stats_stat_field_check;

ALTER TABLE public.match_unavailable_stats
  ADD CONSTRAINT match_unavailable_stats_stat_field_check
  CHECK (stat_field IN (
    'points',
    'block_points',
    'plus_minus',
    'break_points',
    'serve_total',
    'serve_aces',
    'serve_errors',
    'reception_total',
    'reception_errors',
    'reception_positive_pct',
    'reception_excellent_pct',
    'attack_total',
    'attack_errors',
    'attack_blocked',
    'attack_kills'
  ));

CREATE INDEX IF NOT EXISTS match_unavailable_stats_match_id_idx
  ON public.match_unavailable_stats (match_id);

GRANT SELECT ON public.match_unavailable_stats TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.match_unavailable_stats TO authenticated;
GRANT ALL ON public.match_unavailable_stats TO service_role;

ALTER TABLE public.match_unavailable_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_unavailable_stats'
      AND policyname = 'public read match_unavailable_stats'
  ) THEN
    CREATE POLICY "public read match_unavailable_stats"
      ON public.match_unavailable_stats
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'match_unavailable_stats'
      AND policyname = 'admin write match_unavailable_stats'
  ) THEN
    CREATE POLICY "admin write match_unavailable_stats"
      ON public.match_unavailable_stats
      FOR ALL
      TO authenticated
      USING (public.is_admin_email())
      WITH CHECK (public.is_admin_email());
  END IF;
END;
$$;