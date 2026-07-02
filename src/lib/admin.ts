import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin check: reads the `is_admin` boolean on the current user's
 * `profiles` row (see db/migrations/003_blog_and_posts.sql).
 *
 * To grant yourself admin access, run in the Supabase SQL editor:
 *   UPDATE public.profiles SET is_admin = true WHERE id = '<your-auth-user-id>';
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", uid)
        .maybeSingle();
      if (!cancelled) {
        setIsAdmin(!!(data as { is_admin?: boolean } | null)?.is_admin);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { isAdmin, loading };
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
  return !!(data as { is_admin?: boolean } | null)?.is_admin;
}