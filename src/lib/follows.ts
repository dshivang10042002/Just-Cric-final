import { supabase } from "@/integrations/supabase/client";

export type EntityType = "team" | "player";

export async function getFollowState(entityType: EntityType, entityId: string) {
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id ?? null;

  // count followers
  const { count } = await supabase
    .from("follows" as never)
    .select("*", { count: "exact", head: true })
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  let following = false;
  if (me) {
    const { data } = await supabase
      .from("follows" as never)
      .select("id")
      .eq("follower_id", me)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    following = !!data;
  }
  return { count: count ?? 0, following, me };
}

export async function follow(entityType: EntityType, entityId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to follow");
  const { error } = await supabase
    .from("follows" as never)
    .insert({ follower_id: u.user.id, entity_type: entityType, entity_id: entityId } as never);
  if (error && !/duplicate key/i.test(error.message)) throw error;
}

export async function unfollow(entityType: EntityType, entityId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase
    .from("follows" as never)
    .delete()
    .eq("follower_id", u.user.id)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (error) throw error;
}
