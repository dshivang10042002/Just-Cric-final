import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Award, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — JustCric" }] }),
  component: Leaderboard,
});

type BallRow = {
  runs: number;
  extra_type: string | null;
  is_wicket: boolean;
  wicket_type: string | null;
  batter_id: string | null;
  bowler_id: string | null;
  dismissed_player_id: string | null;
};
type Member = {
  id: string;
  player_name: string;
  jersey_number: number | null;
  team: { id: string; name: string; jersey_color: string | null } | null;
};

type BatRow = { id: string; runs: number; balls: number; outs: number; fours: number; sixes: number };
type BowlRow = { id: string; runs: number; legal: number; wkts: number };

function Leaderboard() {
  const [batters, setBatters] = useState<Array<BatRow & { m: Member }>>([]);
  const [bowlers, setBowlers] = useState<Array<BowlRow & { m: Member }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: balls } = await supabase
        .from("balls")
        .select(
          "runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id, dismissed_player_id",
        );
      const bs = (balls as BallRow[]) ?? [];

      const batMap = new Map<string, BatRow>();
      const bowlMap = new Map<string, BowlRow>();

      bs.forEach((b) => {
        if (b.batter_id) {
          const row = batMap.get(b.batter_id) ?? {
            id: b.batter_id,
            runs: 0,
            balls: 0,
            outs: 0,
            fours: 0,
            sixes: 0,
          };
          if (b.extra_type !== "wide") row.balls++;
          const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
          if (isBatRun) {
            const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
            row.runs += r;
            if (r === 4) row.fours++;
            if (r === 6) row.sixes++;
          }
          batMap.set(b.batter_id, row);
        }
        if (b.dismissed_player_id) {
          const row = batMap.get(b.dismissed_player_id) ?? {
            id: b.dismissed_player_id,
            runs: 0,
            balls: 0,
            outs: 0,
            fours: 0,
            sixes: 0,
          };
          row.outs++;
          batMap.set(b.dismissed_player_id, row);
        }
        if (b.bowler_id) {
          const row = bowlMap.get(b.bowler_id) ?? {
            id: b.bowler_id,
            runs: 0,
            legal: 0,
            wkts: 0,
          };
          row.runs += b.runs;
          if (b.extra_type !== "wide" && b.extra_type !== "noball") row.legal++;
          if (b.is_wicket && b.wicket_type !== "runout") row.wkts++;
          bowlMap.set(b.bowler_id, row);
        }
      });

      const ids = Array.from(new Set([...batMap.keys(), ...bowlMap.keys()]));
      if (ids.length === 0) {
        setBatters([]);
        setBowlers([]);
        setLoading(false);
        return;
      }
      const { data: mems } = await supabase
        .from("team_members")
        .select("id, player_name, jersey_number, team:teams(id, name, jersey_color)")
        .in("id", ids);
      const memMap = new Map<string, Member>();
      ((mems as unknown as Member[]) ?? []).forEach((m) => memMap.set(m.id, m));

      const batArr = [...batMap.values()]
        .map((r) => ({ ...r, m: memMap.get(r.id)! }))
        .filter((r) => r.m && r.balls > 0)
        .sort((a, b) => b.runs - a.runs || b.fours + b.sixes - (a.fours + a.sixes))
        .slice(0, 25);
      const bowlArr = [...bowlMap.values()]
        .map((r) => ({ ...r, m: memMap.get(r.id)! }))
        .filter((r) => r.m && r.legal > 0)
        .sort((a, b) => b.wkts - a.wkts || a.runs / Math.max(1, a.legal) - b.runs / Math.max(1, b.legal))
        .slice(0, 25);

      setBatters(batArr);
      setBowlers(bowlArr);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="label-caps text-muted-foreground">Global Elite Status</div>
        <h1 className="mt-1 font-display text-4xl tracking-tight sm:text-5xl">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregated from every ball you've scored.
        </p>

        {loading ? (
          <div className="mt-6 h-40 animate-pulse rounded-xl border border-border bg-card" />
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card title="Top run scorers" icon={<Trophy className="h-4 w-4 text-primary" />}>
              {batters.length === 0 ? (
                <Empty text="No batting data yet — score a match!" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Player</th>
                      <th className="py-2 px-2 text-center">R</th>
                      <th className="py-2 px-2 text-center">B</th>
                      <th className="py-2 px-2 text-center">4s</th>
                      <th className="py-2 px-2 text-center">6s</th>
                      <th className="py-2 pl-2 text-right text-primary">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batters.map((r, i) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="py-2 pr-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2">
                          <Link
                            to="/players/$playerId"
                            params={{ playerId: r.id }}
                            className="hover:text-primary"
                          >
                            {r.m.player_name}
                          </Link>
                          {r.m.team && (
                            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                              {r.m.team.name}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-display text-lg text-primary">
                          {r.runs}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-xs">{r.balls}</td>
                        <td className="py-2 px-2 text-center font-mono text-xs">{r.fours}</td>
                        <td className="py-2 px-2 text-center font-mono text-xs">{r.sixes}</td>
                        <td className="py-2 pl-2 text-right font-mono text-xs">
                          {((r.runs / r.balls) * 100).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="Top wicket takers" icon={<Award className="h-4 w-4 text-accent" />}>
              {bowlers.length === 0 ? (
                <Empty text="No bowling data yet — score a match!" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Player</th>
                      <th className="py-2 px-2 text-center">O</th>
                      <th className="py-2 px-2 text-center">R</th>
                      <th className="py-2 px-2 text-center text-accent">W</th>
                      <th className="py-2 pl-2 text-right">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowlers.map((r, i) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="py-2 pr-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2">
                          <Link
                            to="/players/$playerId"
                            params={{ playerId: r.id }}
                            className="hover:text-primary"
                          >
                            {r.m.player_name}
                          </Link>
                          {r.m.team && (
                            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                              {r.m.team.name}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-xs">
                          {Math.floor(r.legal / 6)}.{r.legal % 6}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-xs">{r.runs}</td>
                        <td className="py-2 px-2 text-center font-display text-lg text-accent">
                          {r.wkts}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono text-xs">
                          {((r.runs / r.legal) * 6).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-elevate">
      <h2 className="flex items-center gap-2 font-display text-2xl tracking-tight">
        {icon} {title}
      </h2>
      <div className="mt-3 overflow-x-auto">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}
