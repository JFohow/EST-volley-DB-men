-- NULL classification flags meant "not this type". Every match has at least one
-- flag set to true, so this only changes rows that were already false.
UPDATE public.matches SET vm = false WHERE vm IS NULL;
UPDATE public.matches SET am = false WHERE am IS NULL;
UPDATE public.matches SET mam = false WHERE mam IS NULL;

ALTER TABLE public.matches
  ALTER COLUMN vm SET DEFAULT false,
  ALTER COLUMN vm SET NOT NULL,
  ALTER COLUMN am SET DEFAULT false,
  ALTER COLUMN am SET NOT NULL,
  ALTER COLUMN mam SET DEFAULT false,
  ALTER COLUMN mam SET NOT NULL;
