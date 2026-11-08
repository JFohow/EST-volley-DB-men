-- Already applied to the production database by hand. Do not run this file
-- against that database again; it is for setting up new environments.

CREATE UNIQUE INDEX players_person_key
  ON public.players (lower(btrim(first_name)), lower(btrim(last_name)), birth_date) NULLS NOT DISTINCT;
