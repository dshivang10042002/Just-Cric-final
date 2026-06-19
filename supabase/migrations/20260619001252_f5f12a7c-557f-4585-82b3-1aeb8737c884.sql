
-- 1. Case-insensitive unique username
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- 2. Teams get a shareable join code
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS join_code text;

UPDATE public.teams
SET join_code = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE join_code IS NULL;

ALTER TABLE public.teams
  ALTER COLUMN join_code SET NOT NULL,
  ALTER COLUMN join_code SET DEFAULT upper(substr(md5(random()::text || gen_random_uuid()::text), 1, 6));

CREATE UNIQUE INDEX IF NOT EXISTS teams_join_code_unique
  ON public.teams (join_code);

-- 3. Allow a player to leave a team they joined (self-row delete)
DROP POLICY IF EXISTS "Player can leave team" ON public.team_members;
CREATE POLICY "Player can leave team"
  ON public.team_members FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- 4. Security-definer function: join a team using its code
CREATE OR REPLACE FUNCTION public.join_team_with_code(
  p_code text,
  p_player_name text,
  p_jersey int DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_team uuid;
  v_member uuid;
  v_existing uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_team FROM public.teams WHERE join_code = upper(trim(p_code));
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'Invalid team code';
  END IF;

  SELECT id INTO v_existing
  FROM public.team_members
  WHERE team_id = v_team AND profile_id = v_user
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'You are already in this team';
  END IF;

  INSERT INTO public.team_members (team_id, profile_id, player_name, jersey_number, role)
  VALUES (
    v_team,
    v_user,
    COALESCE(NULLIF(trim(p_player_name), ''), 'Player'),
    p_jersey,
    p_role
  )
  RETURNING id INTO v_member;

  RETURN v_member;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_team_with_code(text, text, int, text) TO authenticated;
