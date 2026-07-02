import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — JustCric" }] }),
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) throw redirect({ to: "/auth", search: { mode: "login" } });

    const { data } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();

    if (!(data as { is_admin?: boolean } | null)?.is_admin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPanel,
});