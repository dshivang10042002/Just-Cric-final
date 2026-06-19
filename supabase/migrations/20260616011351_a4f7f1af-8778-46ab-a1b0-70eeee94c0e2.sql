
-- MATCHES
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_a_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  team_b_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  overs INT NOT NULL DEFAULT 20,
  venue TEXT,
  toss_winner_id UUID REFERENCES public.teams(id),
  toss_decision TEXT CHECK (toss_decision IN ('bat','bowl')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed')),
  winner_team_id UUID REFERENCES public.teams(id),
  result_text TEXT,
  current_innings INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (team_a_id <> team_b_id)
);
GRANT SELECT ON public.matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Authenticated create matches" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator updates matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator deletes matches" ON public.matches FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER matches_touch_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- INNINGS
CREATE TABLE public.innings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  innings_no INT NOT NULL CHECK (innings_no IN (1,2)),
  batting_team_id UUID NOT NULL REFERENCES public.teams(id),
  bowling_team_id UUID NOT NULL REFERENCES public.teams(id),
  runs INT NOT NULL DEFAULT 0,
  wickets INT NOT NULL DEFAULT 0,
  balls INT NOT NULL DEFAULT 0,
  extras INT NOT NULL DEFAULT 0,
  target INT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, innings_no)
);
GRANT SELECT ON public.innings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.innings TO authenticated;
GRANT ALL ON public.innings TO service_role;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Innings viewable by everyone" ON public.innings FOR SELECT USING (true);
CREATE POLICY "Match creator manages innings" ON public.innings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.created_by = auth.uid()));

CREATE TRIGGER innings_touch_updated_at BEFORE UPDATE ON public.innings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- BALLS
CREATE TABLE public.balls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  innings_id UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
  ball_index INT NOT NULL,
  over_number INT NOT NULL,
  ball_in_over INT NOT NULL,
  batter_name TEXT,
  bowler_name TEXT,
  runs INT NOT NULL DEFAULT 0,
  extra_type TEXT CHECK (extra_type IN ('wide','noball','bye','legbye')),
  is_wicket BOOLEAN NOT NULL DEFAULT false,
  wicket_type TEXT,
  dismissed_player TEXT,
  commentary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (innings_id, ball_index)
);
GRANT SELECT ON public.balls TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.balls TO authenticated;
GRANT ALL ON public.balls TO service_role;
ALTER TABLE public.balls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Balls viewable by everyone" ON public.balls FOR SELECT USING (true);
CREATE POLICY "Match creator manages balls" ON public.balls FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.innings i JOIN public.matches m ON m.id = i.match_id
    WHERE i.id = innings_id AND m.created_by = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.innings i JOIN public.matches m ON m.id = i.match_id
    WHERE i.id = innings_id AND m.created_by = auth.uid()
  ));

CREATE INDEX idx_matches_created_by ON public.matches(created_by);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_innings_match ON public.innings(match_id);
CREATE INDEX idx_balls_innings ON public.balls(innings_id, ball_index DESC);

-- Enable Realtime for live scorecards
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.innings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.balls;
