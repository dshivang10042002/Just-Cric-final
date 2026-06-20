import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { Activity, ListOrdered, MessageSquare, Radio, Star, Trophy, Users } from "lucide-react";
 
export const Route = createFileRoute("/match/$matchId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Live Scorecard — JustCric" }] }),
  component: PublicScorecard,
});
 
type Team = { id: string; name: string; short_name: string | null; jersey_color: string | null };
type Match = {
  id: string;
  overs: number;
  venue: string | null;
  status: "scheduled" | "live" | "completed";
  current_innings: number;
  result_text: string | null;
  motm_player_id: string | null;
  team_a: Team;
  team_b: Team;
};
type Innings = {
  id: string;
  innings_no: number;
  batting_team_id: string;
  bowling_team_id: string;
  runs: number;
  wickets: number;
  balls: number;
  extras: number;
  target: number | null;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
};
type Ball = {
  id: string;
  innings_id: string;
  ball_index: number;
  over_number: number;
  ball_in_over: number;
  runs: number;
  extra_type: "wide" | "noball" | "bye" | "legbye" | null;
  is_wicket: boolean;
  wicket_type: string | null;
  batter_id: string | null;
  bowler_id: string | null;
  dismissed_player_id: string | null;
};
type Member = { id: string; player_name: string; team_id: string; jersey_number: number | null };
type MotmProfile = { id: string; full_name: string | null; avatar_url: string | null };
 
type Tab = "live" | "scorecard" | "commentary" | "summary" | "squads";
const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "live", label: "Live", icon: <Radio className="h-3.5 w-3.5" /> },
  { id: "scorecard", label: "Scorecard", icon: <ListOrdered className="h-3.5 w-3.5" /> },
  { id: "commentary", label: "Commentary", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: "summary", label: "Summary", icon: <Trophy className="h-3.5 w-3.5" /> },
  { id: "squads", label: "Squads", icon: <Users className="h-3.5 w-3.5" /> },
];
 
function PublicScorecard() {
  const { matchId } = Route.useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [innings, setInnings] = useState<Innings[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [players, setPlayers] = useState<Record<string, Member>>({});
  const [squad, setSquad] = useState<{ a: Member[]; b: Member[] }>({ a: [], b: [] });
  const [motmProfile, setMotmProfile] = useState<MotmProfile | null>(null);
  const [motmMember, setMotmMember] = useState<Member | null>(null);
  const [tab, setTab] = useState<Tab>("live");
 
  const load = async () => {
    const { data: m } = await supabase
      .from("matches")
      .select(
        "id, overs, venue, status, current_innings, result_text, motm_player_id, team_a:teams!matches_team_a_id_fkey(id, name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(id, name, short_name, jersey_color)",
      )
      .eq("id", matchId)
      .maybeSingle();
    const mm = m as unknown as Match | null;
    setMatch(mm);
    if (!mm) return;
 
    const { data: inn } = await supabase
      .from("innings")
      .select("id, innings_no, batting_team_id, bowling_team_id, runs, wickets, balls, extras, target, striker_id, non_striker_id, bowler_id")
      .eq("match_id", matchId)
      .order("innings_no");
    const innList = (inn as Innings[]) ?? [];
    setInnings(innList);
 
    if (innList.length) {
      const inIds = innList.map((i) => i.id);
      const { data: bs } = await supabase
        .from("balls")
        .select("id, innings_id, ball_index, over_number, ball_in_over, runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id, dismissed_player_id")
        .in("innings_id", inIds)
        .order("ball_index", { ascending: true });
      setBalls((bs as Ball[]) ?? []);
    }
 
    const { data: ms } = await supabase
      .from("team_members")
      .select("id, player_name, team_id, jersey_number")
      .in("team_id", [mm.team_a.id, mm.team_b.id]);
    const memList = (ms as Member[]) ?? [];
    const map: Record<string, Member> = {};
    memList.forEach((p) => (map[p.id] = p));
    setPlayers(map);
    setSquad({
      a: memList.filter((p) => p.team_id === mm.team_a.id),
      b: memList.filter((p) => p.team_id === mm.team_b.id),
    });
 
    // Load MOTM
    if (mm.motm_player_id) {
      const motmMem = memList.find((p) => p.id === mm.motm_player_id) ?? null;
      setMotmMember(motmMem);
      // Try to get profile photo via profile_id
      const { data: prof } = await supabase
        .from("team_members")
        .select("profile_id")
        .eq("id", mm.motm_player_id)
        .maybeSingle();
      const profileId = (prof as { profile_id?: string | null })?.profile_id;
      if (profileId) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", profileId)
          .maybeSingle();
        setMotmProfile((pData as MotmProfile) ?? null);
      }
    }
  };
 
  useEffect(() => {
    load();
    const ch = supabase
      .channel(`match-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "innings", filter: `match_id=eq.${matchId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "balls" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);
 
  const currentInn = useMemo(
    () => innings.find((i) => i.innings_no === match?.current_innings) ?? innings[innings.length - 1],
    [innings, match?.current_innings],
  );
  const battingTeam = useMemo(() => {
    if (!match || !currentInn) return null;
    return currentInn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
  }, [match, currentInn]);
 
  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <StickyHeader match={match} innings={innings} battingTeamId={battingTeam?.id ?? null} />
 
        {/* Tabs — Cricbuzz style underline */}
        <div className="sticky top-16 z-30 -mx-4 mt-0 border-b border-border bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative inline-flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
                  tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
                {tab === t.id && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
 
        <div className="mt-4">
          {tab === "live" && (
            <LiveTab match={match} innings={innings} currentInn={currentInn} balls={balls} players={players} />
          )}
          {tab === "scorecard" && (
            <ScorecardTab match={match} innings={innings} balls={balls} players={players} />
          )}
          {tab === "commentary" && (
            <CommentaryTab innings={innings} balls={balls} players={players} match={match} />
          )}
          {tab === "summary" && (
            <SummaryTab match={match} innings={innings} balls={balls} players={players} motmMember={motmMember} motmProfile={motmProfile} />
          )}
          {tab === "squads" && <SquadsTab match={match} squad={squad} />}
        </div>
 
        <div className="mt-10 text-center text-xs text-muted-foreground">
          Powered by <Link to="/" className="text-primary">JustCric</Link>
        </div>
      </main>
    </div>
  );
}
 
/* ---------- Sticky header (Cricbuzz style) ---------- */
function StickyHeader({ match, innings, battingTeamId }: { match: Match; innings: Innings[]; battingTeamId: string | null }) {
  return (
    <div className="-mx-4 -mt-8 bg-card border-b border-border px-4 pt-5 pb-0 sm:-mx-6 sm:px-6">
      {/* Match meta */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
        <span className="uppercase tracking-widest">{match.overs} overs{match.venue ? ` · ${match.venue}` : ""}</span>
        {match.status === "live" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 font-bold text-destructive text-[10px] uppercase tracking-wider">
            <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
          </span>
        )}
        {match.status === "completed" && (
          <span className="font-bold text-primary text-[10px] uppercase tracking-wider">Completed</span>
        )}
      </div>
 
      {/* Team scores — Cricbuzz card style */}
      <div className="flex flex-col gap-0">
        {[match.team_a, match.team_b].map((team, idx) => {
          const inn = innings.find((i) => i.batting_team_id === team.id);
          const oversStr = inn ? `${Math.floor(inn.balls / 6)}.${inn.balls % 6} Ov` : "";
          const isBatting = battingTeamId === team.id && match.status === "live";
          return (
            <div
              key={team.id}
              className={`flex items-center gap-3 px-1 py-3 ${idx === 0 ? "border-b border-border/50" : ""}`}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md font-display text-[11px] font-bold text-white"
                style={{ backgroundColor: team.jersey_color || "#003527" }}
              >
                {(team.short_name || team.name).slice(0, 3).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-semibold truncate block ${isBatting ? "text-primary" : "text-foreground"}`}>
                  {team.name}
                  {isBatting && <span className="ml-2 text-[9px] uppercase tracking-widest text-primary font-bold">batting</span>}
                </span>
              </div>
              <div className="text-right">
                {inn ? (
                  <>
                    <span className="font-display text-xl tabular-nums text-foreground">
                      {inn.runs}<span className="text-muted-foreground text-base">/{inn.wickets}</span>
                    </span>
                    <div className="text-[10px] text-muted-foreground font-mono">{oversStr}</div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Yet to bat</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
 
      {match.status === "completed" && match.result_text && (
        <div className="mt-0 border-t border-border px-1 py-2.5 text-xs font-semibold text-primary">
          {match.result_text}
        </div>
      )}
    </div>
  );
}
 
/* ---------- Ball helpers ---------- */
function ballLabel(b: Ball) {
  if (b.is_wicket) return "W";
  if (b.extra_type === "wide") return `Wd${b.runs > 1 ? `+${b.runs - 1}` : ""}`;
  if (b.extra_type === "noball") return `Nb${b.runs > 1 ? `+${b.runs - 1}` : ""}`;
  if (b.extra_type === "bye") return `B${b.runs}`;
  if (b.extra_type === "legbye") return `Lb${b.runs}`;
  return String(b.runs);
}
function ballPill(b: Ball) {
  return `grid h-8 min-w-8 place-items-center rounded-full px-1.5 font-mono text-xs font-bold ${
    b.is_wicket
      ? "bg-destructive text-destructive-foreground"
      : b.runs >= 6
        ? "bg-primary text-primary-foreground"
        : b.runs === 4
          ? "bg-primary/25 text-primary font-bold"
          : "bg-secondary text-foreground"
  }`;
}
 
/* ---------- Live tab ---------- */
function LiveTab({ match, currentInn, balls, players }: {
  match: Match; innings: Innings[]; currentInn: Innings | undefined; balls: Ball[]; players: Record<string, Member>;
}) {
  if (!currentInn) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Match hasn&apos;t started yet.
      </div>
    );
  }
  const innBalls = balls.filter((b) => b.innings_id === currentInn.id);
  const lastSix = innBalls.slice(-6);
  const oversDone = currentInn.balls / 6;
  const runRate = oversDone > 0 ? currentInn.runs / oversDone : 0;
  const reqRR = currentInn.target != null && match.overs * 6 - currentInn.balls > 0
    ? (currentInn.target - currentInn.runs) / ((match.overs * 6 - currentInn.balls) / 6)
    : null;
 
  return (
    <div className="space-y-4">
      {/* At the crease */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="bg-secondary/30 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
          Innings {currentInn.innings_no} · At the crease
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <PlayerLine label="Striker" name={currentInn.striker_id ? players[currentInn.striker_id]?.player_name : null} accent />
          <PlayerLine label="Non-striker" name={currentInn.non_striker_id ? players[currentInn.non_striker_id]?.player_name : null} />
          <PlayerLine label="Bowler" name={currentInn.bowler_id ? players[currentInn.bowler_id]?.player_name : null} />
        </div>
      </div>
 
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Mini label="Run Rate" v={runRate.toFixed(2)} />
        {reqRR != null ? <Mini label="Req. RR" v={reqRR > 0 ? reqRR.toFixed(2) : "—"} accent /> : <Mini label="Extras" v={currentInn.extras} />}
        <Mini label="Overs" v={`${Math.floor(currentInn.balls / 6)}.${currentInn.balls % 6}/${match.overs}`} />
      </div>
 
      {currentInn.target != null && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm">
          Target <b className="text-foreground">{currentInn.target}</b> ·{" "}
          Need <b className="text-primary">{Math.max(0, currentInn.target - currentInn.runs)}</b> runs in{" "}
          <b>{Math.max(0, match.overs * 6 - currentInn.balls)}</b> balls
        </div>
      )}
 
      {lastSix.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">This over</div>
          <div className="flex flex-wrap gap-2">
            {lastSix.map((b) => (
              <span key={b.id} className={ballPill(b)}>{ballLabel(b)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
 
function PlayerLine({ label, name, accent }: { label: string; name: string | null | undefined; accent?: boolean }) {
  return (
    <div className={`px-3 py-3 ${accent ? "bg-primary/5" : ""}`}>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 truncate font-semibold text-sm ${accent ? "text-primary" : "text-foreground"}`}>{name || "—"}</div>
    </div>
  );
}
function Mini({ label, v, accent }: { label: string; v: string | number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{v}</p>
    </div>
  );
}
 
/* ---------- Scorecard tab — Cricbuzz style ---------- */
type BatLine = { id: string; name: string; runs: number; balls: number; fours: number; sixes: number; out: boolean; outDesc: string };
type BowlLine = { id: string; name: string; legal: number; runs: number; wkts: number; maidens: number };
 
function buildInningsTables(innBalls: Ball[], players: Record<string, Member>) {
  const batMap = new Map<string, BatLine>();
  const order: string[] = [];
  const ensureBat = (id: string) => {
    if (!batMap.has(id)) {
      batMap.set(id, { id, name: players[id]?.player_name ?? "—", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, outDesc: "not out" });
      order.push(id);
    }
    return batMap.get(id)!;
  };
  innBalls.forEach((b) => {
    if (b.batter_id) {
      const row = ensureBat(b.batter_id);
      if (b.extra_type !== "wide") row.balls++;
      const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
      if (isBatRun) {
        const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
        row.runs += r;
        if (r === 4) row.fours++;
        if (r === 6) row.sixes++;
      }
    }
    if (b.is_wicket && b.dismissed_player_id) {
      const row = ensureBat(b.dismissed_player_id);
      row.out = true;
      const bowlerName = b.bowler_id ? players[b.bowler_id]?.player_name : null;
      row.outDesc = b.wicket_type === "runout" ? "run out" : b.wicket_type ? `${b.wicket_type}${bowlerName ? " b " + bowlerName : ""}` : bowlerName ? `b ${bowlerName}` : "out";
    }
  });
  const bowlMap = new Map<string, BowlLine>();
  const perOver = new Map<string, Map<number, { runs: number; legal: number }>>();
  innBalls.forEach((b) => {
    if (!b.bowler_id) return;
    const row = bowlMap.get(b.bowler_id) ?? { id: b.bowler_id, name: players[b.bowler_id]?.player_name ?? "—", legal: 0, runs: 0, wkts: 0, maidens: 0 };
    row.runs += b.runs;
    if (b.extra_type !== "wide" && b.extra_type !== "noball") row.legal++;
    if (b.is_wicket && b.wicket_type !== "runout") row.wkts++;
    bowlMap.set(b.bowler_id, row);
    const ovMap = perOver.get(b.bowler_id) ?? new Map();
    const o = ovMap.get(b.over_number) ?? { runs: 0, legal: 0 };
    o.runs += b.runs;
    if (b.extra_type !== "wide" && b.extra_type !== "noball") o.legal++;
    ovMap.set(b.over_number, o);
    perOver.set(b.bowler_id, ovMap);
  });
  perOver.forEach((ovMap, bid) => {
    let maidens = 0;
    ovMap.forEach((o) => { if (o.legal >= 6 && o.runs === 0) maidens++; });
    const row = bowlMap.get(bid);
    if (row) row.maidens = maidens;
  });
  return { batting: order.map((id) => batMap.get(id)!), bowling: [...bowlMap.values()] };
}
 
function ScorecardTab({ match, innings, balls, players }: { match: Match; innings: Innings[]; balls: Ball[]; players: Record<string, Member> }) {
  if (innings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Scorecard appears once the match starts.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {innings.map((inn) => {
        const battingTeam = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
        const innBalls = balls.filter((b) => b.innings_id === inn.id);
        const { batting, bowling } = buildInningsTables(innBalls, players);
        const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
        return (
          <div key={inn.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Innings header — green like Cricbuzz */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: battingTeam.jersey_color || "#003527" }}
            >
              <div>
                <div className="font-display text-lg text-white">{battingTeam.name}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-widest">Innings {inn.innings_no}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl tabular-nums text-white">{inn.runs}/{inn.wickets}</div>
                <div className="text-[10px] text-white/60 font-mono">{overs} Ov</div>
              </div>
            </div>
 
            {/* Batting table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/40">
                    <th className="py-2 pl-4 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Batter</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">R</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">B</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">4s</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">6s</th>
                    <th className="py-2 pl-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {batting.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">No batting yet</td></tr>
                  ) : batting.map((r, i) => (
                    <tr key={r.id} className={`border-t border-border/50 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="py-2.5 pl-4 pr-2">
                        <div className={`font-semibold text-sm ${!r.out ? "text-primary" : "text-foreground"}`}>{r.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{r.out ? r.outDesc : "not out ✦"}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-display text-base font-bold">{r.runs}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs text-muted-foreground">{r.balls}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs">{r.fours}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs text-primary font-semibold">{r.sixes}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs">
                        {r.balls > 0 ? ((r.runs / r.balls) * 100).toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
 
            <div className="border-t border-border/50 bg-secondary/20 px-4 py-2 text-xs text-muted-foreground">
              Extras: <b className="text-foreground">{inn.extras}</b> · Total: <b className="text-foreground">{inn.runs}/{inn.wickets} ({overs} Ov)</b>
            </div>
 
            {/* Bowling table */}
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/40">
                    <th className="py-2 pl-4 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bowler</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">O</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">M</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">R</th>
                    <th className="py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">W</th>
                    <th className="py-2 pl-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {bowling.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-xs text-muted-foreground">No bowling yet</td></tr>
                  ) : bowling.map((r, i) => (
                    <tr key={r.id} className={`border-t border-border/50 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="py-2.5 pl-4 pr-2 font-semibold text-sm">{r.name}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs">{Math.floor(r.legal / 6)}.{r.legal % 6}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs">{r.maidens}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs">{r.runs}</td>
                      <td className="py-2.5 px-2 text-center font-display text-base text-primary font-bold">{r.wkts}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs">
                        {r.legal > 0 ? ((r.runs / r.legal) * 6).toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
 
/* ---------- Commentary ---------- */
function commentaryLine(b: Ball, players: Record<string, Member>) {
  const batter = b.batter_id ? players[b.batter_id]?.player_name ?? "batter" : "batter";
  const bowler = b.bowler_id ? players[b.bowler_id]?.player_name ?? "bowler" : "bowler";
  if (b.is_wicket) {
    const dismissed = b.dismissed_player_id ? players[b.dismissed_player_id]?.player_name : batter;
    return `OUT! ${bowler} to ${dismissed} — ${b.wicket_type ?? "wicket"}.`;
  }
  if (b.extra_type === "wide") return `${bowler} to ${batter}, wide. ${b.runs} run${b.runs === 1 ? "" : "s"}.`;
  if (b.extra_type === "noball") return `${bowler} to ${batter}, NO BALL. ${b.runs} run${b.runs === 1 ? "" : "s"}.`;
  if (b.extra_type === "bye") return `${bowler} to ${batter}, ${b.runs} bye${b.runs === 1 ? "" : "s"}.`;
  if (b.extra_type === "legbye") return `${bowler} to ${batter}, ${b.runs} leg-bye${b.runs === 1 ? "" : "s"}.`;
  if (b.runs === 6) return `SIX! ${bowler} to ${batter}, into the stands.`;
  if (b.runs === 4) return `FOUR! ${bowler} to ${batter}, finds the boundary.`;
  if (b.runs === 0) return `${bowler} to ${batter}, no run.`;
  return `${bowler} to ${batter}, ${b.runs} run${b.runs === 1 ? "" : "s"}.`;
}
 
function CommentaryTab({ innings, balls, players, match }: { innings: Innings[]; balls: Ball[]; players: Record<string, Member>; match: Match }) {
  if (balls.length === 0) {
    return <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Commentary will appear ball-by-ball.</div>;
  }
  return (
    <div className="space-y-6">
      {[...innings].reverse().map((inn) => {
        const team = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
        const inBs = [...balls.filter((b) => b.innings_id === inn.id)].reverse();
        if (inBs.length === 0) return null;
        return (
          <section key={inn.id}>
            <h3 className="font-display text-base text-muted-foreground mb-2">{team.name} · Innings {inn.innings_no}</h3>
            <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {inBs.map((b) => (
                <li key={b.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground pt-0.5">{b.over_number}.{b.ball_in_over}</span>
                  <span className={ballPill(b) + " shrink-0"}>{ballLabel(b)}</span>
                  <p className={`text-sm ${b.is_wicket ? "font-semibold text-destructive" : b.runs >= 6 ? "font-semibold text-primary" : "text-foreground"}`}>
                    {commentaryLine(b, players)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
 
/* ---------- Summary + MOTM ---------- */
function SummaryTab({ match, innings, balls, players, motmMember, motmProfile }: {
  match: Match; innings: Innings[]; balls: Ball[]; players: Record<string, Member>;
  motmMember: Member | null; motmProfile: MotmProfile | null;
}) {
  const milestones: string[] = [];
  const batRunsByPlayer = new Map<string, number>();
  const wktsByPlayer = new Map<string, number>();
  balls.forEach((b) => {
    if (b.batter_id) {
      const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
      if (isBatRun) {
        const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
        batRunsByPlayer.set(b.batter_id, (batRunsByPlayer.get(b.batter_id) ?? 0) + r);
      }
    }
    if (b.bowler_id && b.is_wicket && b.wicket_type !== "runout") {
      wktsByPlayer.set(b.bowler_id, (wktsByPlayer.get(b.bowler_id) ?? 0) + 1);
    }
  });
  batRunsByPlayer.forEach((runs, id) => {
    const name = players[id]?.player_name ?? "—";
    if (runs >= 100) milestones.push(`💯 ${name} scored ${runs}`);
    else if (runs >= 50) milestones.push(`5️⃣0️⃣ ${name} reached ${runs}`);
  });
  wktsByPlayer.forEach((w, id) => {
    const name = players[id]?.player_name ?? "—";
    if (w >= 5) milestones.push(`🔥 ${name} took ${w}-fer`);
    else if (w >= 3) milestones.push(`✋ ${name} took ${w} wickets`);
  });
  const topBatters = [...batRunsByPlayer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, runs]) => ({ id, name: players[id]?.player_name ?? "—", runs }));
  const topBowlers = [...wktsByPlayer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, wkts]) => ({ id, name: players[id]?.player_name ?? "—", wkts }));
 
  return (
    <div className="space-y-4">
      {/* Result */}
      {match.status === "completed" && match.result_text ? (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">Result</div>
          <div className="mt-1 font-display text-xl text-primary">{match.result_text}</div>
        </div>
      ) : match.status === "live" ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
          <div className="font-display text-lg text-destructive">Match in progress</div>
        </div>
      ) : null}
 
      {/* MOTM card with photo */}
      {motmMember && (
        <div className="rounded-xl border border-yellow-400/40 bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-yellow-500 font-bold mb-3">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> Man of the Match
          </div>
          <div className="flex items-center gap-4">
            {motmProfile?.avatar_url ? (
              <img
                src={motmProfile.avatar_url}
                alt={motmMember.player_name}
                className="h-16 w-16 rounded-full object-cover border-2 border-yellow-400/50 shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-yellow-400/20 border-2 border-yellow-400/40 grid place-items-center shrink-0">
                <span className="font-display text-2xl text-yellow-500">
                  {motmMember.player_name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="font-display text-xl text-foreground">{motmProfile?.full_name ?? motmMember.player_name}</div>
              {motmProfile?.full_name && motmProfile.full_name !== motmMember.player_name && (
                <div className="text-xs text-muted-foreground">{motmMember.player_name}</div>
              )}
              <div className="mt-1 text-xs text-yellow-500 font-semibold">⭐ Player of the Match</div>
            </div>
          </div>
        </div>
      )}
 
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg mb-3">Top Scorers</h2>
          {topBatters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No batting data yet.</p>
          ) : (
            <ul className="space-y-2">
              {topBatters.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{r.name}</span>
                  <span className="font-display text-lg text-primary tabular-nums">{r.runs}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-lg mb-3">Top Wicket-Takers</h2>
          {topBowlers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bowling data yet.</p>
          ) : (
            <ul className="space-y-2">
              {topBowlers.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs w-4">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{r.name}</span>
                  <span className="font-display text-lg text-accent tabular-nums">{r.wkts}W</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
 
      {milestones.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-display text-lg mb-3">
            <Activity className="h-4 w-4 text-primary" /> Key Moments
          </h2>
          <ul className="space-y-1.5 text-sm">
            {milestones.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
 
/* ---------- Squads ---------- */
function SquadsTab({ match, squad }: { match: Match; squad: { a: Member[]; b: Member[] } }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[{ team: match.team_a, players: squad.a }, { team: match.team_b, players: squad.b }].map(({ team, players }) => (
        <section key={team.id} className="rounded-xl border border-border bg-card overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md font-display text-[11px] font-bold text-white" style={{ backgroundColor: team.jersey_color || "#003527" }}>
                {(team.short_name || team.name).slice(0, 3).toUpperCase()}
              </span>
              <div>
                <div className="font-display text-base">{team.name}</div>
                <div className="text-[10px] text-muted-foreground">{players.length} players</div>
              </div>
            </div>
            <FollowButton entityType="team" entityId={team.id} size="sm" />
          </header>
          <ul className="divide-y divide-border">
            {players.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">No players.</li>
            ) : players.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-mono text-[11px]">{p.jersey_number ?? "—"}</span>
                <Link to="/players/$playerId" params={{ playerId: p.id }} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                  {p.player_name}
                </Link>
                <FollowButton entityType="player" entityId={p.id} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}