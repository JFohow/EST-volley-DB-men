CREATE TABLE public.match_unavailable_stats_wide (
  match_id BIGINT PRIMARY KEY REFERENCES public.matches(match_id) ON DELETE CASCADE,
  points_unavailable BOOLEAN NOT NULL DEFAULT false,
  block_points_unavailable BOOLEAN NOT NULL DEFAULT false,
  plus_minus_unavailable BOOLEAN NOT NULL DEFAULT false,
  break_points_unavailable BOOLEAN NOT NULL DEFAULT false,
  serve_total_unavailable BOOLEAN NOT NULL DEFAULT false,
  serve_aces_unavailable BOOLEAN NOT NULL DEFAULT false,
  serve_errors_unavailable BOOLEAN NOT NULL DEFAULT false,
  reception_total_unavailable BOOLEAN NOT NULL DEFAULT false,
  reception_errors_unavailable BOOLEAN NOT NULL DEFAULT false,
  reception_positive_pct_unavailable BOOLEAN NOT NULL DEFAULT false,
  reception_excellent_pct_unavailable BOOLEAN NOT NULL DEFAULT false,
  attack_total_unavailable BOOLEAN NOT NULL DEFAULT false,
  attack_errors_unavailable BOOLEAN NOT NULL DEFAULT false,
  attack_blocked_unavailable BOOLEAN NOT NULL DEFAULT false,
  attack_kills_unavailable BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.match_unavailable_stats_wide (
  match_id,
  points_unavailable,
  block_points_unavailable,
  plus_minus_unavailable,
  break_points_unavailable,
  serve_total_unavailable,
  serve_aces_unavailable,
  serve_errors_unavailable,
  reception_total_unavailable,
  reception_errors_unavailable,
  reception_positive_pct_unavailable,
  reception_excellent_pct_unavailable,
  attack_total_unavailable,
  attack_errors_unavailable,
  attack_blocked_unavailable,
  attack_kills_unavailable
)
SELECT
  match_id,
  bool_or(stat_field = 'points'),
  bool_or(stat_field = 'block_points'),
  bool_or(stat_field = 'plus_minus'),
  bool_or(stat_field = 'break_points'),
  bool_or(stat_field = 'serve_total'),
  bool_or(stat_field = 'serve_aces'),
  bool_or(stat_field = 'serve_errors'),
  bool_or(stat_field = 'reception_total'),
  bool_or(stat_field = 'reception_errors'),
  bool_or(stat_field = 'reception_positive_pct'),
  bool_or(stat_field = 'reception_excellent_pct'),
  bool_or(stat_field = 'attack_total'),
  bool_or(stat_field = 'attack_errors'),
  bool_or(stat_field = 'attack_blocked'),
  bool_or(stat_field = 'attack_kills')
FROM public.match_unavailable_stats
GROUP BY match_id;

DROP TABLE public.match_unavailable_stats;

ALTER TABLE public.match_unavailable_stats_wide
  RENAME TO match_unavailable_stats;

ALTER TABLE public.match_unavailable_stats
  RENAME CONSTRAINT match_unavailable_stats_wide_pkey TO match_unavailable_stats_pkey;

ALTER TABLE public.match_unavailable_stats
  RENAME CONSTRAINT match_unavailable_stats_wide_match_id_fkey TO match_unavailable_stats_match_id_fkey;

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
