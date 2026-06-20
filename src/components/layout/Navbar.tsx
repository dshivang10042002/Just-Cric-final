import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Search, Menu, X, Home, Swords, Users, Trophy, Rss,
  TrendingUp, BarChart3, LayoutDashboard, User as UserIcon, LogOut,
} from "lucide-react";
 
const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matches", label: "Matches", icon: Swords },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/feed", label: "Feed", icon: Rss },
  { to: "/rankings", label: "Rankings", icon: TrendingUp },
  { to: "/leaderboard", label: "Stats", icon: BarChart3 },
  { to: "/search", label: "Search", icon: Search },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;
 
export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
 
  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
 
  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);
 
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };
 
  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-12">
 
          {/* Left: hamburger (always) + logo */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
 
              {/* Dropdown menu */}
              {open && (
                <div className="absolute left-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-elevate">
                  {user ? (
                    <>
                      <div className="border-b border-border px-4 py-3">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Signed in</p>
                        <p className="mt-0.5 truncate text-sm font-medium">{user.email}</p>
                      </div>
                      <nav className="py-1.5">
                        {NAV_LINKS.map(({ to, label, icon: Icon }) => {
                          const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
                          return (
                            <Link
                              key={to}
                              to={to}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground hover:bg-secondary"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.3 : 1.8} />
                              {label}
                            </Link>
                          );
                        })}
                      </nav>
                      <div className="border-t border-border py-1.5">
                        <button
                          onClick={signOut}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive transition hover:bg-destructive/10"
                        >
                          <LogOut className="h-4 w-4" /> Sign out
                        </button>
                      </div>
                    </>
                  ) : (
                    <nav className="py-1.5">
                      <Link to="/" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary">
                        <Home className="h-4 w-4" /> Home
                      </Link>
                      <Link to="/" hash="features" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary">
                        Features
                      </Link>
                      <Link to="/" hash="pricing" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary">
                        Pricing
                      </Link>
                    </nav>
                  )}
                </div>
              )}
            </div>
 
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <CricketBall />
              </span>
              <span className="font-display text-2xl tracking-wide text-primary">JustCric</span>
            </Link>
          </div>
 
          {/* Right: search + auth CTA */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/search"
                  className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary"
                  aria-label="Search"
                >
                  <Search className="h-[18px] w-[18px]" />
                </Link>
                <Link
                  to="/dashboard"
                  className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
                >
                  Dashboard
                </Link>
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
    </>
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
