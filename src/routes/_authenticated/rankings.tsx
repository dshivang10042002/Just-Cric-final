import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rankings")({
  head: () => ({ meta: [{ title: "City Rankings — JustCric" }] }),
  component: RankingsPage,
});

type MatchRow = {
  id: string;
  status: string;
  winner_team_id: string | null;
  team_a_id: string;
  team_b_id: string;
};
type TeamRow = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  jersey_color: string | null;
};
type Agg = {
  team: TeamRow;
  played: number;
  wins: number;
  losses: number;
  ties: number;
};

function RankingsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [city, setCity] = useState<string>("__all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: ts }, { data: ms }] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, short_name, city, jersey_color"),
        supabase
          .from("matches")
          .select("id, status, winner_team_id, team_a_id, team_b_id")
          .eq("status", "completed"),
      ]);
      setTeams((ts as TeamRow[]) ?? []);
      setMatches((ms as MatchRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const cities = useMemo(() => {
    const s = new Set<string>();
    teams.forEach((t) => t.city && s.add(t.city.trim()));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [teams]);

  const ranked = useMemo<Agg[]>(() => {
    const map = new Map<string, Agg>();
    teams.forEach((t) =>
      map.set(t.id, { team: t, played: 0, wins: 0, losses: 0, ties: 0 }),
    );
    matches.forEach((m) => {
      [m.team_a_id, m.team_b_id].forEach((tid) => {
        const a = map.get(tid);
        if (!a) return;
        a.played++;
        if (!m.winner_team_id) a.ties++;
        else if (m.winner_team_id === tid) a.wins++;
        else a.losses++;
      });
    });
    let arr = [...map.values()].filter((a) => a.played > 0);
    if (city !== "__all") {
      arr = arr.filter((a) => (a.team.city ?? "").trim() === city);
    }
    arr.sort(
      (x, y) =>
        y.played - x.played ||
        y.wins - x.wins ||
        x.team.name.localeCompare(y.team.name),
    );
    return arr;
  }, [teams, matches, city]);

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="label-caps text-muted-foreground">Global Elite Status</div>
            <h1 className="mt-1 font-display text-4xl tracking-tight sm:text-5xl">
              The Hierarchy of <span className="text-primary">Excellence</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Teams ranked by matches played, then wins.
            </p>
          </div>
          <label className="block">
            <span className="label-caps mb-1.5 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> City
            </span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input min-w-[200px] rounded-full"
            >
              <option value="__all">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="mt-6 h-48 animate-pulse rounded-xl border border-border bg-card" />
        ) : ranked.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-elevate">
            No completed matches yet{city !== "__all" ? ` in ${city}` : ""}. Once teams finish matches
            they&apos;ll appear here.
          </div>
        ) : (
          <>
            {/* Top 3 podium cards */}
            <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-elevate sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl tracking-tight">Top Teams</h2>
                <span className="label-caps text-muted-foreground">
                  {city === "__all" ? "Global" : city}
                </span>
              </div>
              <div className="divide-y divide-border">
                {top3.map((r, i) => {
                  const winPct = r.played > 0 ? (r.wins / r.played) * 100 : 0;
                  return (
                    <Link
                      key={r.team.id}
                      to="/teams/$teamId"
                      params={{ teamId: r.team.id }}
                      className="flex items-center gap-4 py-4 transition hover:bg-muted/40"
                    >
                      <span
                        className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full font-display text-sm ${
                          i === 0
                            ? "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="grid h-10 w-10 flex-shrink-0 place-items-center overflow-hidden rounded-lg font-display text-xs text-white"
                        style={{ backgroundColor: r.team.jersey_color || "#003527" }}
                      >
                        {(r.team.short_name || r.team.name).slice(0, 3).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-lg tracking-tight">{r.team.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {r.team.city || "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-primary">{r.wins} pts</div>
                        <div className="label-caps text-[10px] text-muted-foreground">
                          {winPct.toFixed(0)}% win
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {rest.length > 0 && (
              <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-elevate">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr className="text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <th className="px-3 py-3">#</th>
                      <th className="px-2 py-3">Team</th>
                      {city === "__all" && <th className="px-2 py-3">City</th>}
                      <th className="px-2 py-3 text-center">P</th>
                      <th className="px-2 py-3 text-center">W</th>
                      <th className="px-2 py-3 text-center">L</th>
                      <th className="px-2 py-3 text-center">T</th>
                      <th className="px-3 py-3 text-right text-primary">Win %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((r, i) => {
                      const winPct = r.played > 0 ? (r.wins / r.played) * 100 : 0;
                      return (
                        <tr key={r.team.id} className="border-t border-border">
                          <td className="px-3 py-3 font-mono text-muted-foreground">
                            {i + 4 === 1 ? (
                              <Trophy className="h-4 w-4 text-primary" />
                            ) : (
                              i + 4
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <Link
                              to="/teams/$teamId"
                              params={{ teamId: r.team.id }}
                              className="flex items-center gap-2 hover:text-primary"
                            >
                              <span
                                className="grid h-7 w-7 place-items-center rounded-md font-display text-[10px] text-white"
                                style={{ backgroundColor: r.team.jersey_color || "#003527" }}
                              >
                                {(r.team.short_name || r.team.name).slice(0, 3).toUpperCase()}
                              </span>
                              <span className="truncate font-medium">{r.team.name}</span>
                            </Link>
                          </td>
                          {city === "__all" && (
                            <td className="px-2 py-3 text-muted-foreground">{r.team.city || "—"}</td>
                          )}
                          <td className="px-2 py-3 text-center font-display text-lg">{r.played}</td>
                          <td className="px-2 py-3 text-center font-mono text-xs text-primary">{r.wins}</td>
                          <td className="px-2 py-3 text-center font-mono text-xs text-destructive">
                            {r.losses}
                          </td>
                          <td className="px-2 py-3 text-center font-mono text-xs">{r.ties}</td>
                          <td className="px-3 py-3 text-right font-mono text-xs">
                            {winPct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
