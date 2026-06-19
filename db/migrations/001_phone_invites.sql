-- Feature 1: Invite-only team joining (phone / link / QR)
-- Run this against your Supabase database (psql, Supabase SQL editor,
-- or `supabase db push` if using the CLI).

-- 1) Phone on profiles, unique when set
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

-- 2) RPC: captain adds a player to their team by looking up a registered phone.
CREATE OR REPLACE FUNCTION public.add_team_member_by_phone(
  p_team_id UUID,
  p_phone   TEXT,
  p_jersey  INT DEFAULT NULL,
  p_role    TEXT DEFAULT 'Batter'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   UUID := auth.uid();
  v_owner    UUID;
  v_profile  RECORD;
  v_member   UUID;
  v_clean    TEXT := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT created_by INTO v_owner FROM public.teams WHERE id = p_team_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'team_not_found';
  END IF;
  IF v_owner <> v_caller THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF length(v_clean) < 6 THEN
    RAISE EXCEPTION 'invalid_phone';
  END IF;

  SELECT id, full_name, username
    INTO v_profile
    FROM public.profiles
   WHERE phone = v_clean
   LIMIT 1;

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'phone_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.team_members
     WHERE team_id = p_team_id AND profile_id = v_profile.id
  ) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  INSERT INTO public.team_members (team_id, profile_id, player_name, jersey_number, role)
  VALUES (
    p_team_id,
    v_profile.id,
    COALESCE(NULLIF(v_profile.full_name, ''), v_profile.username, 'Player'),
    p_jersey,
    p_role
  )
  RETURNING id INTO v_member;

  RETURN v_member;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_team_member_by_phone(UUID, TEXT, INT, TEXT) TO authenticated;
