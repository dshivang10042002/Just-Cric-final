import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { TeamMatchCard, type TeamMatchRow } from "@/components/TeamMatchCard";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teams/$teamId/matches")({
  head: () => ({ meta: [{ title: "Team Matches — JustCric" }] }),
  component: TeamMatchesPage,
});

type TeamName = { name: string } | null;

function TeamMatchesPage() {
  const { teamId } = Route.useParams();
  const [team, setTeam] = useState<TeamName>(null);
  const [matches, setMatches] = useState<TeamMatchRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: ms }] = await Promise.all([
        supabase.from("teams").select("name").eq("id", teamId).maybeSingle(),
        supabase
          .from("matches")
          .select(
            "id, overs, venue, status, result_text, created_at, winner_team_id, team_a_id, team_b_id, team_a:teams!matches_team_a_id_fkey(name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(name, short_name, jersey_color), innings(batting_team_id, runs, wickets, balls)",
          )
          .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
          .order("created_at", { ascending: false }),
      ]);
      setTeam((t as TeamName) ?? null);
      setMatches((ms as unknown as TeamMatchRow[]) ?? []);
    })();
  }, [teamId]);

  return (
    <div className="min-h-screen bg-background pb-10">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          to="/teams/$teamId"
          params={{ teamId }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {team?.name ?? "Team"}
        </Link>
        <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
          All <span className="text-primary">matches</span>
        </h1>

        {matches === null ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No matches played yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {matches.map((m) => (
              <TeamMatchCard key={m.id} match={m} teamId={teamId} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}