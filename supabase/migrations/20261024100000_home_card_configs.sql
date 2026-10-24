CREATE TABLE IF NOT EXISTS public.home_card_configs (
  metric_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO public.home_card_configs (metric_id, enabled) VALUES
  ('totalTop:appearances', true),
  ('totalTop:sets', true),
  ('totalTop:points', true),
  ('totalTop:breakPoints', false),
  ('totalTop:plusMinus', true),
  ('totalTop:serveTotal', true),
  ('totalTop:serveAces', true),
  ('totalTop:serveErrors', false),
  ('totalTop:receptionTotal', true),
  ('totalTop:receptionErrors', false),
  ('totalTop:receptionPositivePct', true),
  ('totalTop:receptionExcellentPct', true),
  ('totalTop:attackTotal', true),
  ('totalTop:attackErrors', false),
  ('totalTop:attackBlocked', false),
  ('totalTop:attackKills', true),
  ('totalTop:attackKillPct', true),
  ('totalTop:attackEfficiency', true),
  ('totalTop:blockPoints', true),
  ('gameHigh:pointsPerGame', true),
  ('gameHigh:plusMinusBest', true),
  ('gameHigh:plusMinusWorst', false),
  ('gameHigh:serveTotal', false),
  ('gameHigh:serveAces', true),
  ('gameHigh:serveErrorsMost', false),
  ('gameHigh:serveErrorsLeast', false),
  ('gameHigh:receptionTotal', true),
  ('gameHigh:receptionErrors', false),
  ('gameHigh:receptionPositivePctBest', true),
  ('gameHigh:receptionPositivePctWorst', false),
  ('gameHigh:receptionExcellentPctBest', true),
  ('gameHigh:receptionExcellentPctWorst', false),
  ('gameHigh:attackTotal', true),
  ('gameHigh:attackErrors', false),
  ('gameHigh:attackBlocked', false),
  ('gameHigh:attackKills', true),
  ('gameHigh:attackKillPctBest', true),
  ('gameHigh:attackKillPctWorst', false),
  ('gameHigh:attackEfficiencyBest', true),
  ('gameHigh:attackEfficiencyWorst', false),
  ('gameHigh:blockPoints', true)
ON CONFLICT (metric_id) DO NOTHING;

GRANT SELECT ON public.home_card_configs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_card_configs TO authenticated;
GRANT ALL ON public.home_card_configs TO service_role;

ALTER TABLE public.home_card_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read home_card_configs"
  ON public.home_card_configs
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "admin manage home_card_configs"
  ON public.home_card_configs
  FOR ALL
  TO authenticated
  USING (public.is_admin_email())
  WITH CHECK (public.is_admin_email());