-- Already applied to the production database by hand. Do not run this file
-- against that database again; it is for setting up new environments.

ALTER TABLE public.match_sets
  ADD CONSTRAINT match_sets_set_number_check CHECK (set_number BETWEEN 1 AND 8),
  ADD CONSTRAINT match_sets_points_check CHECK (estonia_points >= 0 AND opponent_points >= 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.match_sets'::regclass
      AND contype = 'u'
  ) THEN
    ALTER TABLE public.match_sets
      ADD CONSTRAINT match_sets_match_set_number_key UNIQUE (match_id, set_number);
  END IF;
END $$;

ALTER TABLE public.appearances
  ADD CONSTRAINT appearances_player_match_key UNIQUE (player_id, match_id);

ALTER TABLE public.player_match_stats
  ADD CONSTRAINT player_match_stats_appearance_version_key UNIQUE (appearance_id, stats_version);
