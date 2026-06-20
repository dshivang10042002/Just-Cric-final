import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Radio } from "lucide-react";
 
export const Route = createFileRoute("/_authenticated/matches/")({
  component: MatchesList,
});
 
type Row = {
  id: string;
  overs: number;
  venue: string | null;
  status: "scheduled" | "live" | "completed";
  result_text: string | null;
  team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
  team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
  created_at: string;
};
 
function MatchesList() {
  const [rows, setRows] = useState<Row[] | null>(null);
 
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("matches")
        .select(
          "id, overs, venue, status, result_text, created_at, team_a:teams!matches_team_a_id_fkey(name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(name, short_name, jersey_color)",
        )
        .eq("created_by", u.user.id)
        .order("created_at", { ascending: false });
      setRows((data as unknown as Row[]) ?? []);
    })();
  }, []);
 
  return (
    <div className="min-h-screen bg-background pb-6">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight sm:text-5xl">
              Your <span className="text-primary">Matches</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Live, upcoming and completed.</p>
          </div>
          <Link
            to="/matches/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New match
          </Link>
        </div>
 
        {rows === null ? (
          <div className="mt-6 grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-3xl">🏏</div>
            <h2 className="font-display text-xl sm:text-2xl">No matches yet — Start Scoring!</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a match between two of your teams to begin.</p>
            <Link
              to="/matches/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> Create a match
            </Link>
          </div>
        ) : (
          <ul className="mt-5 grid gap-3">
            {rows.map((m) => {
              const linkTo = m.status === "completed" ? "/match/$matchId" : "/matches/$matchId/score";
              return (
                <li key={m.id}>
                  <Link
                    to={linkTo}
                    params={{ matchId: m.id }}
                    className="block rounded-xl border border-border bg-card p-4 shadow-elevate transition hover:border-primary/30 active:scale-[0.99]"
                  >
                    {/* Top row: status badge + meta */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <StatusBadge status={m.status} />
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground truncate">
                        {m.overs} ov{m.venue ? ` · ${m.venue}` : ""}
                      </span>
                    </div>
 
                    {/* Teams row */}
                    <div className="flex items-center gap-2">
                      <TeamChip team={m.team_a} />
                      <span className="shrink-0 font-display text-base text-muted-foreground px-1">vs</span>
                      <TeamChip team={m.team_b} />
                    </div>
 
                    {/* Result text if completed */}
                    {m.status === "completed" && m.result_text && (
                      <div className="mt-2.5 text-xs font-medium text-primary truncate">
                        {m.result_text}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
 
function TeamChip({
  team,
}: {
  team: { name: string; short_name: string | null; jersey_color: string | null } | null;
}) {
  if (!team) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md font-display text-xs font-bold text-white"
        style={{ backgroundColor: team.jersey_color || "#003527" }}
      >
        {(team.short_name || team.name).slice(0, 3).toUpperCase()}
      </span>
      <span className="truncate text-sm font-semibold">{team.name}</span>
    </div>
  );
}
 
function StatusBadge({ status }: { status: "scheduled" | "live" | "completed" }) {
  if (status === "live") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-destructive">
        <Radio className="h-3 w-3 animate-pulse" /> Live
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        Result
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full border border-primary/40 px-2.5 py-0.5 text-[11px] uppercase tracking-widest text-primary">
      Scheduled
    </span>
  );
}