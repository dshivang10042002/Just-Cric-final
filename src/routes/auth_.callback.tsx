import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            console.error("[auth/callback] exchangeCodeForSession error:", error.message);
            navigate({ to: "/auth", search: { mode: "login" } });
          } else {
            navigate({ to: "/dashboard" });
          }
        });
    } else {
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          listener.subscription.unsubscribe();
          navigate({ to: "/dashboard" });
        }
      });

      const timer = setTimeout(() => {
        listener.subscription.unsubscribe();
        navigate({ to: "/auth", search: { mode: "login" } });
      }, 3000);

      return () => {
        clearTimeout(timer);
        listener.subscription.unsubscribe();
      };
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground text-sm">Completing sign-in...</p>
      </div>
    </div>
  );
}