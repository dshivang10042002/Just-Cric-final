import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Swords, Search, BarChart3, LayoutDashboard, Users, Trophy, Rss, TrendingUp, User } from "lucide-react";
 
const TABS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard") },
  { to: "/matches", label: "Matches", icon: Swords, match: (p: string) => p.startsWith("/matches") },
  { to: "/teams", label: "Teams", icon: Users, match: (p: string) => p.startsWith("/teams") },
  { to: "/tournaments", label: "Cups", icon: Trophy, match: (p: string) => p.startsWith("/tournaments") },
  { to: "/feed", label: "Feed", icon: Rss, match: (p: string) => p.startsWith("/feed") },
  { to: "/rankings", label: "Rankings", icon: TrendingUp, match: (p: string) => p.startsWith("/rankings") },
  { to: "/leaderboard", label: "Stats", icon: BarChart3, match: (p: string) => p.startsWith("/leaderboard") },
  { to: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
  { to: "/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/profile") },
] as const;
 
/** Mobile-only bottom tab bar — hidden on md+ where the top Navbar takes over. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
 
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full border-t border-border bg-card/95 backdrop-blur-md md:hidden">
      <div className="flex items-center overflow-x-auto scrollbar-none px-1 py-1.5 gap-0.5">
        {TABS.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className={
                active
                  ? "flex flex-none flex-col items-center justify-center gap-0.5 rounded-xl bg-primary/10 px-3 py-1.5 text-primary transition active:scale-90"
                  : "flex flex-none flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-muted-foreground transition active:scale-90"
              }
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.8} />
              <span className="label-caps text-[9px] tracking-normal whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}