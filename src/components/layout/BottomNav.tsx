import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Swords, Search, BarChart3, LayoutDashboard } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { to: "/matches", label: "Matches", icon: Swords, match: (p: string) => p.startsWith("/matches") },
  { to: "/search", label: "Search", icon: Search, match: (p: string) => p.startsWith("/search") },
  { to: "/leaderboard", label: "Stats", icon: BarChart3, match: (p: string) => p.startsWith("/leaderboard") || p.startsWith("/rankings") },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard") },
] as const;

/** Mobile-only bottom tab bar — hidden on md+ where the top Navbar takes over. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md md:hidden">
      {TABS.map(({ to, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={to}
            to={to}
            className={
              active
                ? "flex flex-col items-center justify-center gap-0.5 rounded-full bg-primary/10 px-4 py-1.5 text-primary transition active:scale-90"
                : "flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 text-muted-foreground transition active:scale-90"
            }
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.8} />
            <span className="label-caps text-[10px] tracking-normal">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
