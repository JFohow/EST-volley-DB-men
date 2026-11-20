-- Older matches publish only total attack errors (out-of-bounds + blocked).
-- That total is stored in attack_errors_combined. Newer matches keep attack_errors
-- (out-of-bounds) and attack_blocked, and combined is their sum.

ALTER TABLE public.player_match_stats
  ADD COLUMN attack_errors_combined integer;

ALTER TABLE public.match_team_totals
  ADD COLUMN attack_errors_combined integer;

-- Newer matches: combined = out-of-bounds + blocked.
UPDATE public.player_match_stats
SET attack_errors_combined = attack_errors + attack_blocked
WHERE attack_errors IS NOT NULL
  AND attack_blocked IS NOT NULL;

UPDATE public.match_team_totals
SET attack_errors_combined = attack_errors + attack_blocked
WHERE attack_errors IS NOT NULL
  AND attack_blocked IS NOT NULL;

-- Older matches: move the official total out of attack_errors.
UPDATE public.player_match_stats p
SET attack_errors_combined = p.attack_errors,
    attack_errors = NULL
FROM public.appearances a
WHERE a.appearance_id = p.appearance_id
  AND a.match_id IN (405, 406, 407, 408, 409, 410, 411, 597, 598, 600, 602, 603)
  AND p.attack_errors IS NOT NULL
  AND p.attack_blocked IS NULL;

UPDATE public.match_team_totals
SET attack_errors_combined = attack_errors,
    attack_errors = NULL
WHERE match_id IN (405, 406, 407, 408, 409, 410, 411, 597, 598, 600, 602, 603)
  AND attack_errors IS NOT NULL
  AND attack_blocked IS NULL;

-- Team attack efficiency = (kills - combined errors) / total. Same result as before for newer matches.
ALTER TABLE public.match_team_totals
  DROP COLUMN attack_efficiency;

ALTER TABLE public.match_team_totals
  ADD COLUMN attack_efficiency numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN attack_total > 0 THEN round(
        100.0 * (attack_kills - attack_errors_combined)::numeric / attack_total,
        2
      )
    END
  ) STORED;
