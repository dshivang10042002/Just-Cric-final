
ALTER TABLE public.balls
  ADD COLUMN IF NOT EXISTS batter_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS non_striker_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bowler_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dismissed_player_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS wicket_type TEXT;

CREATE INDEX IF NOT EXISTS idx_balls_batter ON public.balls(batter_id);
CREATE INDEX IF NOT EXISTS idx_balls_bowler ON public.balls(bowler_id);
CREATE INDEX IF NOT EXISTS idx_balls_dismissed ON public.balls(dismissed_player_id);

ALTER TABLE public.innings
  ADD COLUMN IF NOT EXISTS striker_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS non_striker_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bowler_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;
