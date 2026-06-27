import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { LiveTicker } from "@/components/layout/LiveTicker";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, UserPlus, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — JustCric" }] }),
  component: Dashboard,
});

type Profile = {
  full_name: string | null;
  username: string | null;
  city: string | null;
  role: string | null;
  avatar_url: string | null;
};

type Stats = {
  matches: number;
  runs: number;
  wickets: number;
  best: number | null;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({ matches: 0, runs: 0, wickets: 0, best: null });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const userId = u.user.id;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, username, city, role, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      setProfile((prof as Profile) ?? null);

      // Player stats: find team_member rows that link to this user
      const { data: memberRows } = await supabase
        .from("team_members")
        .select("id")
        .eq("profile_id", userId);
      const memberIds = (memberRows ?? []).map((r) => r.id as string);
      if (memberIds.length === 0) {
        setStats({ matches: 0, runs: 0, wickets: 0, best: null });
        return;
      }
      // Fetch ALL balls for this player across ALL teams they belong to
      const orFilter = [
        ...memberIds.map((id) => `batter_id.eq.${id}`),
        ...memberIds.map((id) => `bowler_id.eq.${id}`),
      ].join(",");

      const { data: allBalls } = await supabase
        .from("balls")
        .select("innings_id, runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id")
        .or(orFilter);

      const balls = (allBalls ?? []) as {
        innings_id: string; runs: number; extra_type: string | null;
        is_wicket: boolean; wicket_type: string | null;
        batter_id: string | null; bowler_id: string | null;
      }[];

      // Per-innings batting runs
      const perInn = new Map<string, number>();
      const inningsSet = new Set<string>();
      for (const b of balls) {
        if (!memberIds.includes(b.batter_id ?? "")) continue;
        inningsSet.add(b.innings_id);
        const isExtra = b.extra_type === "wide" || b.extra_type === "bye" || b.extra_type === "legbye";
        if (isExtra) continue;
        const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
        perInn.set(b.innings_id, (perInn.get(b.innings_id) ?? 0) + r);
      }
      const totalRuns = Array.from(perInn.values()).reduce((a, b) => a + b, 0);
      const best = perInn.size > 0 ? Math.max(...perInn.values()) : null;

      // Wickets — exclude runout and retired_hurt
      const wickets = balls.filter(
        (b) => memberIds.includes(b.bowler_id ?? "") && b.is_wicket
          && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt"
      ).length;

      // Distinct matches via innings
      let matches = 0;
      if (inningsSet.size > 0) {
        const { data: innMatches } = await supabase
          .from("innings")
          .select("match_id")
          .in("id", Array.from(inningsSet));
        matches = new Set((innMatches ?? []).map((r) => r.match_id as string)).size;
      }

      setStats({ matches, runs: totalRuns, wickets, best });
    })();
  }, []);

  const name = profile?.full_name || profile?.username || "Player";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <LiveTicker />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="block">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-border bg-secondary">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-primary">{initial}</span>
              )}
            </div>
          </Link>
          <div>
            <h1 className="font-display text-3xl tracking-tight sm:text-5xl">
              {greeting()}, <span className="text-primary">{name}</span> 🏏
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.username ? `@${profile.username}` : "Set a username on your profile"}
              {profile?.city ? ` · ${profile.city}` : ""}
              {profile?.role ? ` · ${profile.role}` : ""}
            </p>
          </div>
        </div>

        {/* Stats row — real numbers */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Matches" value={String(stats.matches)} />
          <Stat label="Runs" value={String(stats.runs)} accent="accent" />
          <Stat label="Wickets" value={String(stats.wickets)} />
          <Stat label="Best score" value={stats.best != null ? String(stats.best) : "—"} accent="accent" />
        </div>
        {stats.matches === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Stats show up once you join a team (with a code) and play matches.
          </p>
        )}

        {/* Quick actions */}
        <div className="mt-10">
          <h2 className="font-display text-2xl tracking-tight">Quick actions</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Action title="+ New Match" desc="Score a game ball-by-ball" to="/matches/new" />
            <Action title="+ Create Team" desc="Add players, jerseys, roles" to="/teams/new" />
            <Action title="Join a Team" desc="Use a 6-character team code" to="/join-team" icon={<UserPlus className="h-4 w-4" />} />
            <Action title="Search" desc="Find teams, players, matches" to="/search" icon={<SearchIcon className="h-4 w-4" />} />
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Panel title="Tournaments">
            <Link
              to="/tournaments"
              className="flex items-center gap-3 rounded-lg border border-dashed border-border p-5 hover:border-primary/40"
            >
              <Trophy className="h-6 w-6 text-[color:var(--gold)]" />
              <div>
                <div className="font-medium">Browse tournaments</div>
                <div className="text-xs text-muted-foreground">Knockout & league brackets</div>
              </div>
            </Link>
          </Panel>
          <Panel title="Leaderboard">
            <Link
              to="/leaderboard"
              className="flex items-center gap-3 rounded-lg border border-dashed border-border p-5 hover:border-primary/40"
            >
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <div className="font-medium">See top scorers & bowlers</div>
                <div className="text-xs text-muted-foreground">All-time stats</div>
              </div>
            </Link>
          </Panel>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary" | "accent";
}) {
  const color = accent === "accent" ? "text-[color:var(--gold)]" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-elevate">
      <div className="label-caps text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-4xl ${color}`}>{value}</div>
    </div>
  );
}

function Action({
  title,
  desc,
  to,
  icon,
}: {
  title: string;
  desc: string;
  to: "/teams/new" | "/matches/new" | "/join-team" | "/search";
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-xl border border-border bg-card p-5 text-left shadow-elevate transition active:scale-[0.98] hover:border-primary/30"
    >
      <div className="flex items-center gap-2 font-display text-xl tracking-tight text-primary">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </Link>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-elevate">
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}