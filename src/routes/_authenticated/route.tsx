import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { mode: "login" } });
    }
    return { user: data.user };
  },
  component: () => (
    <div className="pb-20 md:pb-0">
      <Outlet />
      <BottomNav />
    </div>
  ),
});
