import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/best-strikers")({
  ssr: false,
  head: () => ({ meta: [{ title: "Best Strikers — JustCric" }] }),
  component: BestStrikersPage,
});

type Striker = {
  id: string; name: string; avatar: string | null; team: string;
  runs: number; balls: number; sr: number;
  fours: number; sixes: number;
  role: string | null; city: string | null;
  batting_style: string | null;
};

function BestStrikersPage() {
  const [players, setPlayers] = useState<Striker[]>([]);
  const [loading, setLoading] = useState(true);
  const [minBalls, setMinBalls] = useState(20);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("balls")
        .select("batter_id, batter_name, runs, extra_type, team_members!balls_batter_id_fkey(player_name, role, batting_style, profiles(avatar_url, city, batting_style, role), teams:team_members_team_id_fkey(name))")
        .not("batter_id", "is", null)
        .limit(10000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, any>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (!row.batter_id) return;
        const tm = row.team_members ?? {};
        const prof = tm.profiles ?? {};
        if (!map.has(row.batter_id)) {
          map.set(row.batter_id, {
            name: tm.player_name ?? row.batter_name ?? "—",
            avatar: prof.avatar_url ?? null,
            team: tm.teams?.name ?? "—",
            role: prof.role ?? tm.role ?? null,
            city: prof.city ?? null,
            batting_style: prof.batting_style ?? tm.batting_style ?? null,
            runs: 0, balls: 0, fours: 0, sixes: 0,
          });
        }
        const p = map.get(row.batter_id);
        if (row.extra_type !== "wide") p.balls++;
        const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
        if (isBat) {
          const r = row.extra_type === "noball" ? row.runs - 1 : row.runs;
          p.runs += r;
          if (r === 4) p.fours++;
          if (r === 6) p.sixes++;
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sorted: Striker[] = [...map.entries()]
        .filter(([, v]) => v.balls >= 20)
        .map(([id, v]: [string, any]) => ({
          id, name: v.name, avatar: v.avatar, team: v.team,
          runs: v.runs, balls: v.balls,
          sr: Math.round((v.runs / v.balls) * 100),
          fours: v.fours, sixes: v.sixes,
          role: v.role, city: v.city,
          batting_style: v.batting_style,
        }))
        .sort((a, b) => b.sr - a.sr);

      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);

  const filtered = players.filter((p) => p.balls >= minBalls);

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
              💥 <span className="text-primary">Best Strikers</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Ranked by strike rate</p>
          </div>
          {/* Min balls filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Min balls:</span>
            {[20, 50, 100].map((b) => (
              <button key={b} onClick={() => setMinBalls(b)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${minBalls === b ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                {b}+
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No players with {minBalls}+ balls faced yet.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p, i) => (
              <StrikerRow key={p.id} p={p} rank={i + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StrikerRow({ p, rank }: { p: Striker; rank: number }) {
  const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const isTop3 = rank <= 3;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 ${isTop3 ? "border-primary/20" : "border-border"}`}>
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-bold ${isTop3 ? `border-primary/30 bg-primary/10 ${rankColors[rank-1]}` : "border-border bg-secondary text-muted-foreground"}`}>
          {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : rank}
        </div>

        {p.avatar ? (
          <img src={p.avatar} alt={p.name} className="h-12 w-12 shrink-0 rounded-xl object-cover border border-border" />
        ) : (
          <div className="h-12 w-12 shrink-0 grid place-items-center rounded-xl bg-primary/15 border border-primary/20">
            <span className="font-display text-xl text-primary">{p.name.slice(0,1).toUpperCase()}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="font-display text-base sm:text-lg truncate">{p.name}</div>
          <div className="text-xs text-muted-foreground truncate">{p.team}{p.city ? ` · 📍${p.city}` : ""}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {p.batting_style && <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">🏏 {p.batting_style}</span>}
            {p.role && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{p.role}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-border pt-3 text-center sm:w-auto sm:shrink-0 sm:gap-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
        <div>
          <div className={`font-display text-base sm:text-xl tabular-nums ${isTop3 ? rankColors[rank-1] : "text-primary"}`}>{p.sr}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">SR</div>
        </div>
        <div>
          <div className="font-display text-base sm:text-xl tabular-nums text-foreground">{p.runs}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Runs</div>
        </div>
        <div>
          <div className="font-display text-base sm:text-xl tabular-nums text-foreground">{p.balls}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Balls</div>
        </div>
        <div>
          <div className="font-display text-base sm:text-xl tabular-nums text-[color:var(--gold)]">{p.sixes}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">6s</div>
        </div>
      </div>
    </div>
  );
}