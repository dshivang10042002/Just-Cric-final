
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  format TEXT NOT NULL DEFAULT 'league' CHECK (format IN ('league','knockout')),
  overs_per_match INTEGER NOT NULL DEFAULT 20,
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','completed')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments_select_all" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_insert_auth" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tournaments_update_owner" ON public.tournaments FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tournaments_delete_owner" ON public.tournaments FOR DELETE TO authenticated USING (auth.uid() = created_by);
CREATE TRIGGER trg_tournaments_updated BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_id)
);
GRANT SELECT ON public.tournament_teams TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_teams TO authenticated;
GRANT ALL ON public.tournament_teams TO service_role;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tt_select_all" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "tt_manage_owner" ON public.tournament_teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND t.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tournaments t WHERE t.id = tournament_id AND t.created_by = auth.uid()));

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
