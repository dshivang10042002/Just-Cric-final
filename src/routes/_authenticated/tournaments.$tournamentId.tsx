import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Trash2, Zap, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tournaments/$tournamentId")({
  component: TournamentDetail,
});

type Tournament = {
  id: string;
  name: string;
  short_name: string | null;
  format: string;
  overs_per_match: number;
  status: string;
  start_date: string | null;
  created_by: string;
};
type Team = { id: string; name: string; short_name: string | null; jersey_color: string | null };
type TT = { id: string; team_id: string; team: Team };
type Match = {
  id: string;
  status: string;
  team_a_id: string;
  team_b_id: string;
  winner_team_id: string | null;
  result_text: string | null;
};

type Row = {
  team: Team;
  p: number;
  w: number;
  l: number;
  t: number;
  pts: number;
};

function TournamentDetail() {
  const { tournamentId } = Route.useParams();
  const navigate = useNavigate();
  const [t, setT] = useState<Tournament | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [enrolled, setEnrolled] = useState<TT[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [pickTeam, setPickTeam] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: tour } = await supabase
      .from("tournaments")
      .select("id, name, short_name, format, overs_per_match, status, start_date, created_by")
      .eq("id", tournamentId)
      .maybeSingle();
    if (!tour) return;
    setT(tour as Tournament);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: mine } = await supabase
        .from("teams")
        .select("id, name, short_name, jersey_color")
        .eq("created_by", u.user.id)
        .order("name");
      setAllTeams((mine as Team[]) ?? []);
    }
    const { data: tts } = await supabase
      .from("tournament_teams")
      .select("id, team_id, team:teams(id, name, short_name, jersey_color)")
      .eq("tournament_id", tournamentId);
    setEnrolled((tts as unknown as TT[]) ?? []);
    const { data: ms } = await supabase
      .from("matches")
      .select("id, status, team_a_id, team_b_id, winner_team_id, result_text")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });
    setMatches((ms as Match[]) ?? []);
  }, [tournamentId]);

  useEffect(() => {
    load();
  }, [load]);

  const availableTeams = useMemo(
    () => allTeams.filter((a) => !enrolled.some((e) => e.team_id === a.id)),
    [allTeams, enrolled],
  );

  const addTeam = async () => {
    if (!pickTeam) return;
    setBusy(true);
    const { error } = await supabase
      .from("tournament_teams")
      .insert({ tournament_id: tournamentId, team_id: pickTeam });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPickTeam("");
    load();
  };

  const removeTeam = async (id: string) => {
    if (!confirm("Remove team from tournament?")) return;
    const { error } = await supabase.from("tournament_teams").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const generateFixtures = async () => {
    if (!t) return;
    if (enrolled.length < 2) return toast.error("Need at least 2 teams");
    if (matches.length > 0 && !confirm("Fixtures already exist. Generate more?")) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setBusy(false);
      return;
    }
    const rows: Array<{
      created_by: string;
      tournament_id: string;
      team_a_id: string;
      team_b_id: string;
      overs: number;
      status: "scheduled";
    }> = [];
    for (let i = 0; i < enrolled.length; i++) {
      for (let j = i + 1; j < enrolled.length; j++) {
        rows.push({
          created_by: u.user.id,
          tournament_id: tournamentId,
          team_a_id: enrolled[i].team_id,
          team_b_id: enrolled[j].team_id,
          overs: t.overs_per_match,
          status: "scheduled",
        });
      }
    }
    const { error } = await supabase.from("matches").insert(rows);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} fixtures generated`);
    load();
  };

  const startMatch = async (m: Match) => {
    // navigate to match setup pre-filled is complex — for now jump to new match with prefill via query is overkill.
    // Simplest: just open scoring after creating innings. But scheduled matches need toss. Send user to /matches/new and let them pick — but they already exist.
    // We'll inline a quick start: pick toss = team A, bat first.
    if (!confirm("Quick-start this match? Team A wins toss & bats first.")) return;
    await supabase
      .from("matches")
      .update({
        status: "live",
        started_at: new Date().toISOString(),
        toss_winner_id: m.team_a_id,
        toss_decision: "bat",
        current_innings: 1,
      })
      .eq("id", m.id);
    await supabase.from("innings").insert({
      match_id: m.id,
      innings_no: 1,
      batting_team_id: m.team_a_id,
      bowling_team_id: m.team_b_id,
    });
    navigate({ to: "/matches/$matchId/score", params: { matchId: m.id } });
  };

  const deleteTournament = async () => {
    if (!confirm("Delete this tournament? Matches will be unlinked.")) return;
    const { error } = await supabase.from("tournaments").delete().eq("id", tournamentId);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/tournaments" });
  };

  const table = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    enrolled.forEach((e) => {
      map.set(e.team_id, { team: e.team, p: 0, w: 0, l: 0, t: 0, pts: 0 });
    });
    matches
      .filter((m) => m.status === "completed")
      .forEach((m) => {
        const a = map.get(m.team_a_id);
        const b = map.get(m.team_b_id);
        if (!a || !b) return;
        a.p++;
        b.p++;
        if (!m.winner_team_id) {
          a.t++;
          b.t++;
          a.pts++;
          b.pts++;
        } else if (m.winner_team_id === m.team_a_id) {
          a.w++;
          b.l++;
          a.pts += 2;
        } else {
          b.w++;
          a.l++;
          b.pts += 2;
        }
      });
    return [...map.values()].sort((x, y) => y.pts - x.pts || y.w - x.w);
  }, [enrolled, matches]);

  if (!t) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  const teamName = (id: string) =>
    enrolled.find((e) => e.team_id === id)?.team.name ?? "—";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Tournaments
        </Link>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl tracking-tight text-primary">{t.name}</h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {t.format.toUpperCase()} · {t.overs_per_match} overs · {t.status}
            </p>
          </div>
          <button
            onClick={deleteTournament}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>

        {/* Teams */}
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Teams</h2>
            <span className="font-mono text-xs text-muted-foreground">{enrolled.length} enrolled</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {enrolled.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 py-1 pl-2 pr-1"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full font-display text-[10px] text-white"
                  style={{ backgroundColor: e.team.jersey_color || "#003527" }}
                >
                  {(e.team.short_name || e.team.name).slice(0, 3).toUpperCase()}
                </span>
                <span className="text-sm">{e.team.name}</span>
                <button
                  onClick={() => removeTeam(e.id)}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Remove"
                >
                  ×
                </button>
              </span>
            ))}
            {enrolled.length === 0 && (
              <p className="text-sm text-muted-foreground">No teams added yet.</p>
            )}
          </div>

          {availableTeams.length > 0 && (
            <div className="mt-4 flex gap-2">
              <select
                className="input flex-1"
                value={pickTeam}
                onChange={(e) => setPickTeam(e.target.value)}
              >
                <option value="">Add a team…</option>
                {availableTeams.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.name}
                  </option>
                ))}
              </select>
              <button
                onClick={addTeam}
                disabled={busy || !pickTeam}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          )}

          {availableTeams.length === 0 && allTeams.length === enrolled.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              All your teams are enrolled.{" "}
              <Link to="/teams/new" className="text-primary hover:underline">
                Create another?
              </Link>
            </p>
          )}
        </section>

        {/* Fixtures */}
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Fixtures</h2>
            <button
              onClick={generateFixtures}
              disabled={busy || enrolled.length < 2}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" /> Generate round-robin
            </button>
          </div>

          {matches.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No fixtures yet. Add teams and generate a round-robin.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {matches.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {teamName(m.team_a_id)}{" "}
                      <span className="text-muted-foreground">vs</span> {teamName(m.team_b_id)}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {m.status.toUpperCase()}
                      {m.result_text ? ` · ${m.result_text}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {m.status === "scheduled" && (
                      <button
                        onClick={() => startMatch(m)}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground"
                      >
                        Start
                      </button>
                    )}
                    {m.status === "live" && (
                      <Link
                        to="/matches/$matchId/score"
                        params={{ matchId: m.id }}
                        className="rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground"
                      >
                        Score
                      </Link>
                    )}
                    <Link
                      to="/match/$matchId"
                      params={{ matchId: m.id }}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Points table */}
        {enrolled.length > 0 && (
          <section className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">Points table</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Team</th>
                    <th className="py-2 px-2 text-center">P</th>
                    <th className="py-2 px-2 text-center">W</th>
                    <th className="py-2 px-2 text-center">L</th>
                    <th className="py-2 px-2 text-center">T</th>
                    <th className="py-2 pl-2 text-right text-primary">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r, i) => (
                    <tr key={r.team.id} className="border-t border-border">
                      <td className="py-2 pr-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="grid h-6 w-6 place-items-center rounded-md font-display text-[10px] text-white"
                            style={{ backgroundColor: r.team.jersey_color || "#003527" }}
                          >
                            {(r.team.short_name || r.team.name).slice(0, 3).toUpperCase()}
                          </span>
                          {r.team.name}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono">{r.p}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.w}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.l}</td>
                      <td className="py-2 px-2 text-center font-mono">{r.t}</td>
                      <td className="py-2 pl-2 text-right font-display text-xl text-primary">
                        {r.pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
