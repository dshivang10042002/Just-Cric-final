import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Search } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <CricketBall />
          </span>
          <span className="font-display text-2xl tracking-wide text-primary">
            JustCric
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link to="/" className="label-caps text-muted-foreground transition hover:text-primary">Home</Link>
          {!user && (
            <>
              <Link to="/" hash="features" className="label-caps text-muted-foreground transition hover:text-primary">Features</Link>
              <Link to="/" hash="pricing" className="label-caps text-muted-foreground transition hover:text-primary">Pricing</Link>
            </>
          )}
          {user && (
            <>
              <Link to="/matches" className="label-caps text-muted-foreground transition hover:text-primary">Matches</Link>
              <Link to="/teams" className="label-caps text-muted-foreground transition hover:text-primary">Teams</Link>
              <Link to="/tournaments" className="label-caps text-muted-foreground transition hover:text-primary">Tournaments</Link>
              <Link to="/rankings" className="label-caps text-muted-foreground transition hover:text-primary">Rankings</Link>
              <Link to="/feed" className="label-caps text-muted-foreground transition hover:text-primary">Feed</Link>
              <Link to="/leaderboard" className="label-caps text-muted-foreground transition hover:text-primary">Stats</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                to="/search"
                className="hidden rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-primary sm:inline-flex"
                aria-label="Search"
              >
                <Search className="h-[18px] w-[18px]" />
              </Link>
              <Link
                to="/profile"
                className="hidden label-caps px-3 py-1.5 text-muted-foreground transition hover:text-primary sm:inline-flex"
              >
                Profile
              </Link>
              <Link
                to="/dashboard"
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
              >
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="label-caps hidden px-3 py-1.5 text-muted-foreground transition hover:text-primary sm:inline-flex"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="label-caps hidden px-3 py-1.5 text-muted-foreground transition hover:text-primary sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/auth"
                search={{ mode: "register" }}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
              >
                Start Scoring
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function CricketBall() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path d="M5 9c4 1 10 1 14 0M5 15c4-1 10-1 14 0" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
