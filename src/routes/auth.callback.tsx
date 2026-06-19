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
    // Supabase appends either ?code=... (PKCE) or #access_token=... (implicit)
    // exchangeCodeForSession handles the PKCE code; onAuthStateChange picks up
    // the implicit token from the hash automatically.
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
      // Implicit flow — session is set automatically via the URL hash;
      // wait briefly for onAuthStateChange to fire, then redirect.
      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN") {
          listener.subscription.unsubscribe();
          navigate({ to: "/dashboard" });
        }
      });
 
      // Fallback: if no event fires within 3 s, send to login
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
    <div className="dark flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}