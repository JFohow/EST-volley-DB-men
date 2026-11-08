-- Denormalized copy of players.last_name on appearances, for easier manual review in the Supabase table editor.
-- Kept in sync by triggers. Run by hand in the Supabase SQL editor on production.

ALTER TABLE public.appearances ADD COLUMN IF NOT EXISTS last_name text;

UPDATE public.appearances a
SET last_name = p.last_name
FROM public.players p
WHERE p.player_id = a.player_id
  AND a.last_name IS DISTINCT FROM p.last_name;

ALTER TABLE public.appearances ALTER COLUMN last_name SET NOT NULL;

CREATE OR REPLACE FUNCTION public.appearances_set_last_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT p.last_name INTO NEW.last_name
  FROM public.players p
  WHERE p.player_id = NEW.player_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appearances_set_last_name ON public.appearances;
CREATE TRIGGER appearances_set_last_name
BEFORE INSERT OR UPDATE OF player_id ON public.appearances
FOR EACH ROW
EXECUTE FUNCTION public.appearances_set_last_name();

CREATE OR REPLACE FUNCTION public.players_sync_last_name_to_appearances()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.appearances
  SET last_name = NEW.last_name
  WHERE player_id = NEW.player_id
    AND last_name IS DISTINCT FROM NEW.last_name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_sync_last_name_to_appearances ON public.players;
CREATE TRIGGER players_sync_last_name_to_appearances
AFTER UPDATE OF last_name ON public.players
FOR EACH ROW
WHEN (OLD.last_name IS DISTINCT FROM NEW.last_name)
EXECUTE FUNCTION public.players_sync_last_name_to_appearances();
