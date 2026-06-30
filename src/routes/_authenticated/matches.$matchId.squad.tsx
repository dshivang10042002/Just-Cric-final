import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { SquadEditor } from "@/components/SquadEditor";
import { ArrowRight, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/matches/$matchId/squad")({
  component: PreMatchSquadPage,
});

type Team = { id: string; name: string; short_name: string | null };
type Member = { id: string; player_name: string; role: string | null; avatar_url: string | null };

function PreMatchSquadPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const [teamA, setTeamA] = useState<Team | null>(null);
  const [teamB, setTeamB] = useState<Team | null>(null);
  const [membersA, setMembersA] = useState<Member[]>([]);
  const [membersB, setMembersB] = useState<Member[]>([]);
  const [editingTeam, setEditingTeam] = useState<"a" | "b" | null>(null);
  const [countA, setCountA] = useState(0);
  const [countB, setCountB] = useState(0);

  const loadCounts = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("match_players")
      .select("team_id")
      .eq("match_id", matchId);
    const a = (data ?? []).filter((r: { team_id: string }) => r.team_id === teamA?.id).length;
    const b = (data ?? []).filter((r: { team_id: string }) => r.team_id === teamB?.id).length;
    setCountA(a);
    setCountB(b);
  };

  useEffect(() => {
    (async () => {
      const { data: m } = await supabase
        .from("matches")
        .select("team_a_id, team_b_id, team_a:teams!matches_team_a_id_fkey(id, name, short_name), team_b:teams!matches_team_b_id_fkey(id, name, short_name)")
        .eq("id", matchId)
        .maybeSingle();
      if (!m) return;
      const ta = (m as unknown as { team_a: Team }).team_a;
      const tb = (m as unknown as { team_b: Team }).team_b;
      setTeamA(ta);
      setTeamB(tb);

      const [{ data: ma }, { data: mb }] = await Promise.all([
        supabase.from("team_members").select("id, player_name, role, profiles(avatar_url)").eq("team_id", ta.id),
        supabase.from("team_members").select("id, player_name, role, profiles(avatar_url)").eq("team_id", tb.id),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMembersA(((ma ?? []) as any[]).map((r) => ({ id: r.id, player_name: r.player_name, role: r.role, avatar_url: r.profiles?.avatar_url ?? null })));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMembersB(((mb ?? []) as any[]).map((r) => ({ id: r.id, player_name: r.player_name, role: r.role, avatar_url: r.profiles?.avatar_url ?? null })));
    })();
  }, [matchId]);

  useEffect(() => { if (teamA && teamB) loadCounts(); }, [teamA, teamB]);

  const goToScoring = () => navigate({ to: "/matches/$matchId/score", params: { matchId } });

  if (!teamA || !teamB) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="mx-auto max-w-2xl px-4 py-10"><div className="h-40 animate-pulse rounded-xl border border-border bg-card" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      {editingTeam && (
        <SquadEditor
          matchId={matchId}
          teamId={editingTeam === "a" ? teamA.id : teamB.id}
          teamName={editingTeam === "a" ? teamA.name : teamB.name}
          allMembers={editingTeam === "a" ? membersA : membersB}
          onClose={() => setEditingTeam(null)}
          onSaved={loadCounts}
        />
      )}

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏏</div>
          <h1 className="font-display text-3xl tracking-tight">Set Playing XI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional — pick who's playing today. You can change this anytime during the match.
          </p>
        </div>

        <div className="space-y-3">
          {[{ team: teamA, count: countA, key: "a" as const }, { team: teamB, count: countB, key: "b" as const }].map(({ team, count, key }) => (
            <button
              key={team.id}
              onClick={() => setEditingTeam(key)}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-display text-lg">{team.name}</div>
                <div className="text-xs text-muted-foreground">
                  {count > 0 ? `${count} player${count === 1 ? "" : "s"} selected` : "No players selected yet"}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={goToScoring}
            className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition active:scale-95 hover:brightness-110"
          >
            Start Scoring →
          </button>
          <Link
            to="/matches/$matchId/score"
            params={{ matchId }}
            className="w-full text-center py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </Link>
        </div>
      </main>
    </div>
  );
}