import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
 
const searchSchema = z.object({
  mode: z.enum(["login", "register"]).default("login"),
});
 
export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — JustCric" },
      { name: "description", content: "Sign in or create your JustCric account." },
    ],
  }),
  component: AuthPage,
});
 
function AuthPage() {
  const { mode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
 
  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState("batsman");
 
  // already signed in? bounce to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);
 
  const setMode = (m: "login" | "register") =>
    navigate({ to: "/auth", search: { mode: m }, replace: true });
 
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName, username, city, role },
          },
        });
        if (error) throw error;
        toast.success("Welcome to JustCric! 🏏");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };
 
  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
      setLoading(false);
    }
    // On success Supabase redirects the browser — no further action needed
  };
 
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Atmospheric background layers */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_6%,transparent)_0%,transparent_70%)]" />
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80" />
      </div>
 
      {/* Wordmark header — auth flows suppress full nav per "destination rule" */}
      <header className="fixed left-0 top-0 z-50 flex h-20 w-full items-center justify-center sm:h-24">
        <Link to="/">
          <h1 className="font-display text-xl italic uppercase tracking-[0.4em] text-primary">
            JustCric
          </h1>
        </Link>
      </header>
 
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-28 sm:px-12 sm:py-32">
        <div className="w-full max-w-[480px] space-y-10">
          <div className="space-y-4 text-center">
            <h2 className="font-display text-4xl text-foreground sm:text-6xl">
              {mode === "login" ? "Enter the Arena" : "Join the Arena"}
            </h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground sm:text-base">
              {mode === "login"
                ? "Access the world's most sophisticated cricket analytics and scouting ecosystem."
                : "Create your account and score your first match in minutes."}
            </p>
          </div>
 
          {/* Tabs */}
          <div className="relative flex justify-center border-b border-border/40">
            <button
              onClick={() => setMode("login")}
              className={
                mode === "login"
                  ? "label-caps border-b-2 border-[color:var(--gold)] px-8 py-4 text-[color:var(--gold)] transition-all duration-300"
                  : "label-caps px-8 py-4 text-muted-foreground/60 transition-all duration-300 hover:text-foreground"
              }
            >
              Login
            </button>
            <button
              onClick={() => setMode("register")}
              className={
                mode === "register"
                  ? "label-caps border-b-2 border-[color:var(--gold)] px-8 py-4 text-[color:var(--gold)] transition-all duration-300"
                  : "label-caps px-8 py-4 text-muted-foreground/60 transition-all duration-300 hover:text-foreground"
              }
            >
              Register
            </button>
          </div>
 
          {/* Form */}
          <form onSubmit={handleEmail} className="space-y-8">
            <div className="space-y-6">
              {mode === "register" && (
                <>
                  <UnderlineField label="Full Name" value={fullName} onChange={setFullName} required />
                  <div className="grid grid-cols-2 gap-6">
                    <UnderlineField label="Username" value={username} onChange={setUsername} required />
                    <UnderlineField label="City" value={city} onChange={setCity} required />
                  </div>
                  <div className="relative">
                    <label className="label-caps mb-1 block text-muted-foreground">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full border-0 border-b border-border bg-transparent py-4 text-foreground outline-none transition-colors focus:border-[color:var(--gold)]"
                    >
                      <option value="batsman">Batsman</option>
                      <option value="bowler">Bowler</option>
                      <option value="allrounder">All-rounder</option>
                      <option value="wicketkeeper">Wicket-keeper</option>
                    </select>
                  </div>
                </>
              )}
              <UnderlineField label="Email Address" type="email" value={email} onChange={setEmail} required />
              <UnderlineField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
              />
            </div>
 
            {mode === "login" && (
              <div className="label-caps flex items-center justify-between">
                <label className="group flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-none border-border bg-transparent text-[color:var(--gold)] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                    Remember Me
                  </span>
                </label>
                <a href="#" className="text-[color:var(--gold)] transition-colors hover:text-primary">
                  Forgot Access?
                </a>
              </div>
            )}
 
            <button
              type="submit"
              disabled={loading}
              className="label-caps w-full bg-[color:var(--gold)] py-5 tracking-[0.2em] text-[color:var(--gold-foreground)] transition-all duration-300 hover:brightness-105 hover:tracking-[0.25em] active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "login" ? "Authorize Entry" : "Create Account"}
            </button>
          </form>
 
          {/* Social */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-border/40" />
              <span className="label-caps text-muted-foreground/60">Continue With</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="flex items-center justify-center gap-3 border border-border/30 py-4 transition-all duration-300 hover:bg-white/5 disabled:opacity-50"
              >
                <GoogleIcon />
                <span className="label-caps">Google</span>
              </button>
              <button
                type="button"
                disabled
                className="flex items-center justify-center gap-3 border border-border/30 py-4 opacity-50 transition-all duration-300"
              >
                <AppleIcon />
                <span className="label-caps">Apple</span>
              </button>
            </div>
          </div>
        </div>
 
        {/* Authority counters */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-1 gap-10 border-t border-border/20 pt-14 sm:mt-24 sm:grid-cols-3 sm:gap-12 sm:pt-16">
          <div className="group text-center">
            <div className="mb-2 font-mono text-3xl font-semibold text-primary transition-transform duration-500 group-hover:-translate-y-1 sm:text-4xl">
              120K+
            </div>
            <div className="label-caps text-muted-foreground">Active Professionals</div>
          </div>
          <div className="group text-center">
            <div className="mb-2 font-mono text-3xl font-semibold text-[color:var(--gold)] transition-transform duration-500 group-hover:-translate-y-1 sm:text-4xl">
              45M+
            </div>
            <div className="label-caps text-muted-foreground">Data Points Processed</div>
          </div>
          <div className="group text-center">
            <div className="mb-2 font-mono text-3xl font-semibold text-foreground transition-transform duration-500 group-hover:-translate-y-1 sm:text-4xl">
              98.2%
            </div>
            <div className="label-caps text-muted-foreground">Scouting Accuracy</div>
          </div>
        </div>
 
        <Link to="/" className="mt-12 text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Back to home
        </Link>
      </main>
 
      <footer className="relative z-10 flex justify-center py-8">
        <div className="label-caps text-[10px] tracking-[0.3em] text-muted-foreground/40">
          © {new Date().getFullYear()} JustCric Elite Ecosystem · Precision Engineered
        </div>
      </footer>
    </div>
  );
}
 
function UnderlineField({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <label className="label-caps mb-1 block text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full border-0 border-b border-border bg-transparent py-3 text-foreground outline-none transition-colors duration-300 focus:border-[color:var(--gold)]"
      />
    </div>
  );
}
 
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.6l6.2 5.2c-.4.4 6.9-5 6.9-14.8 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
 
function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-3.014 1.57-.12 0-.23-.02-.3-.03-.014-.1-.04-.31-.04-.52 0-1.13.566-2.27 1.236-3.04.745-.85 2.064-1.51 3.14-1.55.014.12.03.33.155.49zm4.46 16.5c-.27.62-.4.9-.74 1.45-.48.78-1.16 1.76-2 1.77-.745.01-.937-.49-1.95-.48-1.01.01-1.225.49-1.97.48-.84-.01-1.48-.89-1.96-1.67-1.34-2.16-2.36-6.11-.99-8.78.685-1.32 1.91-2.16 3.24-2.18.79-.01 1.54.53 2.02.53.48 0 1.39-.65 2.34-.56.4.02 1.52.16 2.24 1.21-.06.04-1.34.78-1.32 2.33.02 1.85 1.62 2.47 1.64 2.48-.02.05-.26.89-.86 1.76z" />
    </svg>
  );
}