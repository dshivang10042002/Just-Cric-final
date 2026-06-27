import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/best-players")({
  ssr: false,
  head: () => ({ meta: [{ title: "Best Players — JustCric" }] }),
  component: BestPlayersPage,
});

type Player = {
  id: string; name: string; avatar: string | null; team: string;
  runs: number; wkts: number; score: number; matches: number;
  role: string | null; city: string | null;
  batting_style: string | null; bowling_style: string | null;
};

function BestPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("balls")
        .select("batter_id, bowler_id, batter_name, bowler_name, runs, extra_type, is_wicket, wicket_type, innings_id, team_members!balls_batter_id_fkey(player_name, team_id, role, batting_style, bowling_style, profiles(avatar_url, city, batting_style, bowling_style, role), teams:team_members_team_id_fkey(name))")
        .limit(10000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, any>();
      const ensure = (id: string, tm: any, fallbackName: string) => {
        if (!map.has(id)) {
          const prof = tm?.profiles ?? {};
          map.set(id, {
            name: tm?.player_name ?? fallbackName ?? "—",
            avatar: prof.avatar_url ?? null,
            team: tm?.teams?.name ?? "—",
            role: prof.role ?? tm?.role ?? null,
            city: prof.city ?? null,
            batting_style: prof.batting_style ?? tm?.batting_style ?? null,
            bowling_style: prof.bowling_style ?? tm?.bowling_style ?? null,
            runs: 0, wkts: 0, innings: new Set<string>(),
          });
        }
        return map.get(id);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (row.batter_id) {
          const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
          if (isBat) {
            const r = row.extra_type === "noball" ? row.runs - 1 : row.runs;
            const p = ensure(row.batter_id, row.team_members, row.batter_name);
            p.runs += r;
            if (row.innings_id) p.innings.add(row.innings_id);
          }
        }
        if (row.bowler_id && row.is_wicket && row.wicket_type !== "runout" && row.wicket_type !== "retired_hurt") {
          const p = map.get(row.bowler_id);
          if (p) p.wkts++;
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sorted: Player[] = [...map.entries()]
        .map(([id, v]: [string, any]) => ({
          id, name: v.name, avatar: v.avatar, team: v.team,
          runs: v.runs, wkts: v.wkts,
          score: v.runs + v.wkts * 20,
          matches: v.innings.size,
          role: v.role, city: v.city,
          batting_style: v.batting_style, bowling_style: v.bowling_style,
        }))
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score);

      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-4 mb-8">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            ⭐ <span className="text-primary">Best Players</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Ranked by Runs + (Wickets × 20) combined score</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />)}
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No player data yet.
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((p, i) => (
              <PlayerRow key={p.id} p={p} rank={i + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function PlayerRow({ p, rank }: { p: Player; rank: number }) {
  const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const isTop3 = rank <= 3;
  return (
    <div className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-md ${isTop3 ? "border-primary/20" : "border-border"}`}>
      {/* Rank */}
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold ${isTop3 ? `border-primary/30 bg-primary/10 ${rankColors[rank-1]}` : "border-border bg-secondary text-muted-foreground"}`}>
        {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : rank}
      </div>

      {/* Avatar */}
      {p.avatar ? (
        <img src={p.avatar} alt={p.name} className="h-12 w-12 shrink-0 rounded-xl object-cover border border-border" />
      ) : (
        <div className="h-12 w-12 shrink-0 grid place-items-center rounded-xl bg-primary/15 border border-primary/20">
          <span className="font-display text-xl text-primary">{p.name.slice(0,1).toUpperCase()}</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-display text-lg truncate">{p.name}</div>
        <div className="text-xs text-muted-foreground truncate">{p.team}{p.city ? ` · 📍${p.city}` : ""}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {p.role && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{p.role}</span>}
          {p.batting_style && <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">🏏 {p.batting_style}</span>}
          {p.bowling_style && <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">🎳 {p.bowling_style}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 grid grid-cols-4 gap-4 text-center">
        <div>
          <div className={`font-display text-xl tabular-nums ${isTop3 ? rankColors[rank-1] : "text-primary"}`}>{p.score}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Score</div>
        </div>
        <div>
          <div className="font-display text-xl tabular-nums text-foreground">{p.runs}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Runs</div>
        </div>
        <div>
          <div className="font-display text-xl tabular-nums text-accent">{p.wkts}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Wkts</div>
        </div>
        <div>
          <div className="font-display text-xl tabular-nums text-foreground">{p.matches}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Inn</div>
        </div>
      </div>
    </div>
  );
}