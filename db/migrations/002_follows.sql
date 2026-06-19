-- Feature 4: Follow system for teams + players (team_members)

CREATE TABLE IF NOT EXISTS public.follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('team','player')),
  entity_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS follows_entity_idx
  ON public.follows (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS follows_follower_idx
  ON public.follows (follower_id, created_at DESC);

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows readable by everyone" ON public.follows;
CREATE POLICY "Follows readable by everyone"
  ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON public.follows;
CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);
