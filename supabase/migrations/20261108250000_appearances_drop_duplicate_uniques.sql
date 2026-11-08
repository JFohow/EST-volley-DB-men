-- appearances had four unique constraints on the same (player_id, match_id) pair.
-- Keep appearances_player_match_key and drop the other three. Run by hand in the Supabase SQL editor on production.

ALTER TABLE public.appearances DROP CONSTRAINT IF EXISTS unique_match_player;
ALTER TABLE public.appearances DROP CONSTRAINT IF EXISTS unique_player_match;
ALTER TABLE public.appearances DROP CONSTRAINT IF EXISTS unique_appearance;
