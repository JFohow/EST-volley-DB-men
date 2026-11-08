-- matches.coach_id is the source of truth. The text column was a duplicate.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.matches
    WHERE coach IS NOT NULL AND btrim(coach) <> '' AND coach_id IS NULL
  ) THEN
    RAISE EXCEPTION 'matches has coach text without coach_id; resolve before dropping matches.coach';
  END IF;
END $$;

ALTER TABLE public.matches DROP COLUMN coach;
