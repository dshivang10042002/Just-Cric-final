import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Radio } from "lucide-react";

export const Route = createFileRoute("/_authenticated/matches/")({
  component: MatchesList,
});

type Row = {
  id: string; overs: number; venue: string | null;
  status: "scheduled" | "live" | "completed";
  result_text: string | null; created_at: string;
  team_a_id: string; team_b_id: string; winner_team_id: string | null;
  team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
  team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
  innings: { innings_no: number; batting_team_id: string; runs: number; wickets: number; balls: number; target: number | null }[];
};

function MatchesList() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("matches")
        .select("id, overs, venue, status, result_text, created_at, team_a_id, team_b_id, winner_team_id, team_a:teams!matches_team_a_id_fkey(name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(name, short_name, jersey_color), innings(innings_no, batting_team_id, runs, wickets, balls, target)")
        .eq("created_by", u.user.id)
        .order("created_at", { ascending: false });
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-10">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-8">
          <div>
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
              Your <span className="text-primary">Matches</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Live, upcoming and completed.</p>
          </div>
          <Link to="/matches/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110">
            <Plus className="h-4 w-4" /> New match
          </Link>
        </div>

        {rows === null ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0,1,2,3].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-3xl">🏏</div>
            <h2 className="font-display text-2xl">No matches yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a match between two of your teams to begin.</p>
            <Link to="/matches/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95">
              <Plus className="h-4 w-4" /> Create a match
            </Link>
          </div>
        ) : (
          <>
            {/* Live matches first */}
            {rows.some((r) => r.status === "live") && (
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
                    <Radio className="h-3 w-3 animate-pulse" /> Live now
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rows.filter((r) => r.status === "live").map((m) => <MatchCard key={m.id} m={m} />)}
                </div>
              </div>
            )}

            {/* Scheduled */}
            {rows.some((r) => r.status === "scheduled") && (
              <div className="mb-6">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upcoming</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rows.filter((r) => r.status === "scheduled").map((m) => <MatchCard key={m.id} m={m} />)}
                </div>
              </div>
            )}

            {/* Completed */}
            {rows.some((r) => r.status === "completed") && (
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Results</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rows.filter((r) => r.status === "completed").map((m) => <MatchCard key={m.id} m={m} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ── Cricbuzz-style match card ── */
function MatchCard({ m }: { m: Row }) {
  // Match each innings to its actual batting team by ID, not array position —
  // either team can bat first depending on the toss.
  const innA = m.innings?.find((i) => i.batting_team_id === m.team_a_id) ?? null;
  const innB = m.innings?.find((i) => i.batting_team_id === m.team_b_id) ?? null;
  const sortedInnings = [...(m.innings ?? [])].sort((x, y) => x.innings_no - y.innings_no);
  const currentInn = sortedInnings[sortedInnings.length - 1] ?? null;
  const ta = m.team_a;
  const tb = m.team_b;
  const linkTo = m.status === "completed" ? `/match/${m.id}` : `/matches/${m.id}/score`;
  const oversStr = (inn: { balls: number } | null) => inn ? `${Math.floor(inn.balls / 6)}.${inn.balls % 6}` : null;
  const isBattingA = !!currentInn && currentInn.batting_team_id === m.team_a_id;
  const isBattingB = !!currentInn && currentInn.batting_team_id === m.team_b_id;
  const noResult = m.status === "completed" && !m.winner_team_id;

  return (
    <a href={linkTo}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-elevate transition hover:border-primary/30 hover:shadow-lg active:scale-[0.99]">

      {/* Meta bar */}
      <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {m.status === "live" && (
            <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive shrink-0">
              <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
            </span>
          )}
          {m.status === "completed" && noResult && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">No Result</span>
          )}
          {m.status === "completed" && !noResult && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Result</span>
          )}
          {m.status === "scheduled" && (
            <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary shrink-0">Upcoming</span>
          )}
          <span className="text-[11px] text-muted-foreground truncate">{m.overs} Overs{m.venue ? ` · ${m.venue}` : ""}</span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
          {new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Team rows */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Team A */}
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: ta?.jersey_color || "#003527" }}>
            {(ta?.short_name || ta?.name || "A").slice(0, 3).toUpperCase()}
          </span>
          <span className={`flex-1 min-w-0 truncate text-sm font-semibold ${isBattingA ? "text-foreground" : "text-muted-foreground"}`}>
            {ta?.name ?? "Team A"}
            {isBattingA && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
          </span>
          {innA ? (
            <div className="text-right shrink-0">
              <span className={`font-display tabular-nums ${isBattingA ? "text-xl text-foreground" : "text-base text-muted-foreground"}`}>
                {innA.runs}<span className="text-muted-foreground font-normal text-sm">-{innA.wickets}</span>
              </span>
              {oversStr(innA) && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">({oversStr(innA)})</span>}
            </div>
          ) : <span className="text-xs text-muted-foreground italic shrink-0">Yet to bat</span>}
        </div>

        {/* Team B */}
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: tb?.jersey_color || "#1a472a" }}>
            {(tb?.short_name || tb?.name || "B").slice(0, 3).toUpperCase()}
          </span>
          <span className={`flex-1 min-w-0 truncate text-sm font-semibold ${isBattingB ? "text-foreground" : "text-muted-foreground"}`}>
            {tb?.name ?? "Team B"}
            {isBattingB && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
          </span>
          {innB ? (
            <div className="text-right shrink-0">
              <span className={`font-display tabular-nums ${isBattingB ? "text-xl text-foreground" : "text-base text-muted-foreground"}`}>
                {innB.runs}<span className="text-muted-foreground font-normal text-sm">-{innB.wickets}</span>
              </span>
              {oversStr(innB) && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">({oversStr(innB)})</span>}
            </div>
          ) : <span className="text-xs text-muted-foreground italic shrink-0">Yet to bat</span>}
        </div>
      </div>

      {/* Result / target */}
      {(m.result_text || (m.status === "live" && currentInn?.target)) && (
        <div className="border-t border-border/50 px-4 py-2">
          {m.result_text
            ? <p className="text-xs font-semibold text-primary truncate">{m.result_text}</p>
            : currentInn?.target && <p className="text-xs font-semibold text-primary truncate">Need {Math.max(0, currentInn.target - currentInn.runs)} runs in {Math.max(0, m.overs * 6 - currentInn.balls)} balls</p>
          }
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border/50 flex items-center justify-end gap-4 px-4 py-2 bg-secondary/20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary group-hover:underline">
          {m.status === "live" ? "Score →" : m.status === "completed" ? "Scorecard →" : "View →"}
        </span>
      </div>
    </a>
  );
}