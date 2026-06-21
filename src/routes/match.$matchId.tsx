import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { Radio, Star } from "lucide-react";
 
export const Route = createFileRoute("/match/$matchId")({
  ssr: false,
  head: () => ({ meta: [{ title: "Scorecard — JustCric" }] }),
  component: PublicScorecard,
});
 
/* ─── Types ─── */
type Team = { id: string; name: string; short_name: string | null; jersey_color: string | null };
type Match = {
  id: string; overs: number; venue: string | null;
  status: "scheduled" | "live" | "completed"; current_innings: number;
  result_text: string | null; motm_player_id: string | null;
  team_a: Team; team_b: Team;
};
type Innings = {
  id: string; innings_no: number; batting_team_id: string; bowling_team_id: string;
  runs: number; wickets: number; balls: number; extras: number; target: number | null;
  striker_id: string | null; non_striker_id: string | null; bowler_id: string | null;
};
type Ball = {
  id: string; innings_id: string; ball_index: number; over_number: number; ball_in_over: number;
  runs: number; extra_type: "wide" | "noball" | "bye" | "legbye" | null;
  is_wicket: boolean; wicket_type: string | null;
  batter_id: string | null; bowler_id: string | null; dismissed_player_id: string | null;
};
type Member = { id: string; player_name: string; team_id: string; jersey_number: number | null };
type MotmProfile = { id: string; full_name: string | null; avatar_url: string | null };
type Tab = "live" | "scorecard" | "commentary" | "summary" | "squads";
 
const TABS: { id: Tab; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "scorecard", label: "Scorecard" },
  { id: "commentary", label: "Commentary" },
  { id: "summary", label: "Summary" },
  { id: "squads", label: "Squads" },
];
 
/* ─── Cricbuzz colour tokens ─── */
const CB = {
  green: "#1a472a",       // header bg
  greenLight: "#2d6a4f",  // sub-row bg
  orange: "#f58220",      // active tab underline / highlights
  orangeText: "#e07b1a",
  headerText: "#ffffff",
  rowAlt: "#f9fafb",      // light alt row (light mode)
  border: "hsl(var(--border))",
  muted: "hsl(var(--muted-foreground))",
};
 
/* ═══════════════════════════════════════════
   PUBLIC SCORECARD
═══════════════════════════════════════════ */
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
      .select("id, overs, venue, status, current_innings, result_text, motm_player_id, team_a:teams!matches_team_a_id_fkey(id, name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(id, name, short_name, jersey_color)")
      .eq("id", matchId).maybeSingle();
    const mm = m as unknown as Match | null;
    setMatch(mm);
    if (!mm) return;
 
    const { data: inn } = await supabase.from("innings")
      .select("id, innings_no, batting_team_id, bowling_team_id, runs, wickets, balls, extras, target, striker_id, non_striker_id, bowler_id")
      .eq("match_id", matchId).order("innings_no");
    const innList = (inn as Innings[]) ?? [];
    setInnings(innList);
 
    if (innList.length) {
      const { data: bs } = await supabase.from("balls")
        .select("id, innings_id, ball_index, over_number, ball_in_over, runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id, dismissed_player_id")
        .in("innings_id", innList.map((i) => i.id)).order("ball_index");
      setBalls((bs as Ball[]) ?? []);
    }
 
    const { data: ms } = await supabase.from("team_members")
      .select("id, player_name, team_id, jersey_number")
      .in("team_id", [mm.team_a.id, mm.team_b.id]);
    const memList = (ms as Member[]) ?? [];
    const map: Record<string, Member> = {};
    memList.forEach((p) => (map[p.id] = p));
    setPlayers(map);
    setSquad({ a: memList.filter((p) => p.team_id === mm.team_a.id), b: memList.filter((p) => p.team_id === mm.team_b.id) });
 
    if (mm.motm_player_id) {
      const motmMem = memList.find((p) => p.id === mm.motm_player_id) ?? null;
      setMotmMember(motmMem);
      const { data: prof } = await supabase.from("team_members").select("profile_id").eq("id", mm.motm_player_id).maybeSingle();
      const profileId = (prof as { profile_id?: string | null })?.profile_id;
      if (profileId) {
        const { data: pData } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("id", profileId).maybeSingle();
        setMotmProfile((pData as MotmProfile) ?? null);
      }
    }
  };
 
  useEffect(() => {
    load();
    const ch = supabase.channel(`match-pub-${matchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "innings", filter: `match_id=eq.${matchId}` }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "balls" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);
 
  const currentInn = useMemo(
    () => innings.find((i) => i.innings_no === match?.current_innings) ?? innings[innings.length - 1],
    [innings, match?.current_innings],
  );
 
  if (!match) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10"><div className="h-40 animate-pulse rounded-xl border border-border bg-card" /></div>
    </div>
  );
 
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
 
      {/* ── Cricbuzz-style match header (dark green) ── */}
      <div style={{ background: CB.green }}>
        <div className="mx-auto max-w-4xl px-4 pt-4 pb-0 sm:px-6">
          {/* Match meta */}
          <div className="flex items-center justify-between text-[11px] text-white/60 mb-3">
            <span className="uppercase tracking-widest">{match.overs} Overs{match.venue ? ` · ${match.venue}` : ""}</span>
            {match.status === "live" && (
              <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-bold text-red-300 uppercase tracking-wider">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
              </span>
            )}
          </div>
 
          {/* Team scores */}
          {[match.team_a, match.team_b].map((team, ti) => {
            const inn = innings.find((i) => i.batting_team_id === team.id);
            const isBatting = currentInn?.batting_team_id === team.id && match.status === "live";
            const oversStr = inn ? `${Math.floor(inn.balls / 6)}.${inn.balls % 6} Ov` : "";
            return (
              <div key={team.id} className={`flex items-center gap-3 py-3 ${ti === 0 ? "border-b border-white/10" : ""}`}>
                <div className="flex-1 min-w-0">
                  <span className={`block font-display text-lg truncate ${isBatting ? "text-white" : "text-white/70"}`}>
                    {team.name}
                    {isBatting && <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-green-300">batting</span>}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  {inn ? (
                    <>
                      <span className="font-display text-2xl tabular-nums text-white">
                        {inn.runs}<span className="text-white/50 text-lg">/{inn.wickets}</span>
                      </span>
                      <div className="text-[10px] text-white/50 font-mono">{oversStr}</div>
                    </>
                  ) : (
                    <span className="text-sm text-white/40">Yet to bat</span>
                  )}
                </div>
              </div>
            );
          })}
 
          {/* Result / chase info */}
          {match.status === "completed" && match.result_text && (
            <div className="border-t border-white/10 py-2.5 text-sm font-semibold text-green-300">{match.result_text}</div>
          )}
          {match.status === "live" && currentInn?.target && (
            <div className="border-t border-white/10 py-2 text-xs text-white/70">
              {players[currentInn.batting_team_id] ? "" : ""}
              Need <b className="text-white">{Math.max(0, currentInn.target - currentInn.runs)}</b> runs off{" "}
              <b className="text-white">{Math.max(0, match.overs * 6 - currentInn.balls)}</b> balls ·{" "}
              RRR <b className="text-white">
                {currentInn.balls < match.overs * 6
                  ? (((currentInn.target - currentInn.runs) / (match.overs * 6 - currentInn.balls)) * 6).toFixed(2)
                  : "—"}
              </b>
            </div>
          )}
 
          {/* ── Cricbuzz tabs — white text, orange underline ── */}
          <div className="flex gap-0 overflow-x-auto mt-1 -mx-4 px-4 sm:-mx-6 sm:px-6">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="relative shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-widest transition"
                style={{ color: tab === t.id ? "#fff" : "rgba(255,255,255,0.5)" }}>
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 rounded-full" style={{ background: CB.orange }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
 
      {/* ── Tab content ── */}
      <main className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        {tab === "live" && <LiveTab match={match} innings={innings} currentInn={currentInn} balls={balls} players={players} />}
        {tab === "scorecard" && <ScorecardTab match={match} innings={innings} balls={balls} players={players} />}
        {tab === "commentary" && <CommentaryTab innings={innings} balls={balls} players={players} match={match} />}
        {tab === "summary" && <SummaryTab match={match} innings={innings} balls={balls} players={players} motmMember={motmMember} motmProfile={motmProfile} />}
        {tab === "squads" && <SquadsTab match={match} squad={squad} />}
      </main>
    </div>
  );
}
 
/* ─── Live tab ─── */
function LiveTab({ match, currentInn, balls, players }: {
  match: Match; innings: Innings[]; currentInn: Innings | undefined; balls: Ball[]; players: Record<string, Member>;
}) {
  if (!currentInn) return <EmptyState msg="Match hasn't started yet." />;
 
  const innBalls = balls.filter((b) => b.innings_id === currentInn.id);
  const currentOverNo = Math.floor(currentInn.balls / 6);
  const thisOverBalls = innBalls.filter((b) => b.over_number === currentOverNo);
  const runRate = currentInn.balls > 0 ? ((currentInn.runs / currentInn.balls) * 6).toFixed(2) : "—";
  const reqRR = currentInn.target && (match.overs * 6 - currentInn.balls) > 0
    ? (((currentInn.target - currentInn.runs) / (match.overs * 6 - currentInn.balls)) * 6).toFixed(2) : null;
 
  return (
    <div className="space-y-3">
      {/* At the crease — Cricbuzz green header card */}
      <CbCard>
        <CbCardHeader label={`Innings ${currentInn.innings_no} · At the crease`} />
        <div className="grid grid-cols-3 divide-x divide-border">
          <CbPlayerCell label="Striker ✦" name={currentInn.striker_id ? players[currentInn.striker_id]?.player_name : null} accent />
          <CbPlayerCell label="Non-striker" name={currentInn.non_striker_id ? players[currentInn.non_striker_id]?.player_name : null} />
          <CbPlayerCell label="Bowler" name={currentInn.bowler_id ? players[currentInn.bowler_id]?.player_name : null} />
        </div>
      </CbCard>
 
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Run Rate", value: runRate },
          reqRR ? { label: "Req. RR", value: reqRR, accent: true } : { label: "Extras", value: currentInn.extras },
          { label: "Overs", value: `${Math.floor(currentInn.balls / 6)}.${currentInn.balls % 6}/${match.overs}` },
        ].map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
            <div className={`font-display text-lg tabular-nums ${'accent' in s && s.accent ? "text-primary" : "text-foreground"}`}>{s.value}</div>
          </div>
        ))}
      </div>
 
      {/* This over */}
      {thisOverBalls.length > 0 && (
        <CbCard>
          <CbCardHeader label={`Over ${currentOverNo + 1}`} />
          <div className="flex flex-wrap gap-2 p-3">
            {thisOverBalls.map((b) => <BallPill key={b.id} b={b} />)}
            {Array.from({ length: Math.max(0, 6 - thisOverBalls.length) }).map((_, i) => (
              <span key={i} className="grid h-8 w-8 place-items-center rounded-full border border-dashed border-border text-[10px] text-border">·</span>
            ))}
          </div>
        </CbCard>
      )}
    </div>
  );
}
 
/* ─── Scorecard tab — Cricbuzz green header tables ─── */
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
    if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") row.wkts++;
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
  if (!innings.length) return <EmptyState msg="Scorecard appears once the match starts." />;
  return (
    <div className="space-y-5">
      {innings.map((inn) => {
        const battingTeam = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
        const innBalls = balls.filter((b) => b.innings_id === inn.id);
        const { batting, bowling } = buildInningsTables(innBalls, players);
        const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
        const headerColor = battingTeam.jersey_color || CB.green;
        return (
          <div key={inn.id} className="overflow-hidden rounded-xl border border-border">
            {/* Innings header — team jersey color (Cricbuzz style) */}
            <div className="flex items-center justify-between px-4 py-3" style={{ background: headerColor }}>
              <div>
                <div className="font-display text-base text-white">{battingTeam.name}</div>
                <div className="text-[10px] text-white/60 uppercase tracking-widest">Innings {inn.innings_no}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl tabular-nums text-white">{inn.runs}<span className="text-white/50 text-lg">/{inn.wickets}</span></div>
                <div className="text-[10px] text-white/60 font-mono">{overs} Ov</div>
              </div>
            </div>
 
            {/* Batting table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: CB.green }}>
                    <th className="py-2 pl-4 pr-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/80">Batter</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">R</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">B</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">4s</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">6s</th>
                    <th className="py-2 pl-2 pr-4 text-right text-[10px] font-bold uppercase tracking-wider text-white/80 w-14">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {batting.length === 0 ? (
                    <tr><td colSpan={6} className="py-5 text-center text-xs text-muted-foreground">No batting yet</td></tr>
                  ) : batting.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 1 ? "bg-muted/30" : "bg-card"}>
                      <td className="py-2.5 pl-4 pr-2 border-b border-border/40">
                        <div className={`font-semibold text-sm ${!r.out ? "" : "text-foreground"}`}
                          style={!r.out ? { color: CB.orangeText } : {}}>
                          {r.name}
                          {!r.out && <span className="ml-1 text-[10px]">●</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{r.out ? r.outDesc : "not out"}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-base border-b border-border/40">{r.runs}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs text-muted-foreground border-b border-border/40">{r.balls}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs border-b border-border/40">{r.fours}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs font-semibold border-b border-border/40" style={{ color: CB.orangeText }}>{r.sixes}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs border-b border-border/40">
                        {r.balls > 0 ? ((r.runs / r.balls) * 100).toFixed(1) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
 
            {/* Extras + total */}
            <div className="border-b border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              Extras <b className="text-foreground">{inn.extras}</b>
              <span className="mx-2">·</span>
              Total <b className="text-foreground">{inn.runs}/{inn.wickets} ({overs} Ov)</b>
            </div>
 
            {/* Bowling table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: CB.green }}>
                    <th className="py-2 pl-4 pr-2 text-left text-[10px] font-bold uppercase tracking-wider text-white/80">Bowler</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">O</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">M</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">R</th>
                    <th className="py-2 px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/80 w-10">W</th>
                    <th className="py-2 pl-2 pr-4 text-right text-[10px] font-bold uppercase tracking-wider text-white/80 w-14">Econ</th>
                  </tr>
                </thead>
                <tbody>
                  {bowling.length === 0 ? (
                    <tr><td colSpan={6} className="py-5 text-center text-xs text-muted-foreground">No bowling yet</td></tr>
                  ) : bowling.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 1 ? "bg-muted/30" : "bg-card"}>
                      <td className="py-2.5 pl-4 pr-2 font-semibold text-sm border-b border-border/40">{r.name}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs border-b border-border/40">{Math.floor(r.legal / 6)}.{r.legal % 6}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs border-b border-border/40">{r.maidens}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-xs border-b border-border/40">{r.runs}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-base border-b border-border/40" style={{ color: CB.orangeText }}>{r.wkts}</td>
                      <td className="py-2.5 pl-2 pr-4 text-right font-mono text-xs border-b border-border/40">
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
 
/* ─── Commentary ─── */
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
  if (b.runs === 6) return `SIX! ${bowler} to ${batter}, launched into the stands!`;
  if (b.runs === 4) return `FOUR! ${bowler} to ${batter}, finds the boundary!`;
  if (b.runs === 0) return `${bowler} to ${batter}, dot ball.`;
  return `${bowler} to ${batter}, ${b.runs} run${b.runs === 1 ? "" : "s"}.`;
}
 
function CommentaryTab({ innings, balls, players, match }: { innings: Innings[]; balls: Ball[]; players: Record<string, Member>; match: Match }) {
  if (!balls.length) return <EmptyState msg="Commentary appears ball-by-ball." />;
  return (
    <div className="space-y-5">
      {[...innings].reverse().map((inn) => {
        const team = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
        const inBs = [...balls.filter((b) => b.innings_id === inn.id)].reverse();
        if (!inBs.length) return null;
        return (
          <section key={inn.id}>
            <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{team.name} · Innings {inn.innings_no}</div>
            <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
              {inBs.map((b) => (
                <div key={b.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground pt-0.5">{b.over_number}.{b.ball_in_over}</span>
                  <BallPill b={b} />
                  <p className={`text-sm flex-1 ${b.is_wicket ? "font-semibold text-destructive" : b.runs >= 6 ? "font-semibold" : "text-foreground"}`}
                    style={b.runs >= 6 && !b.is_wicket ? { color: CB.orangeText } : {}}>
                    {commentaryLine(b, players)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
 
/* ─── Summary + MOTM ─── */
function SummaryTab({ match, innings, balls, players, motmMember, motmProfile }: {
  match: Match; innings: Innings[]; balls: Ball[]; players: Record<string, Member>;
  motmMember: Member | null; motmProfile: MotmProfile | null;
}) {
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
  const topBatters = [...batRunsByPlayer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, runs]) => ({ id, name: players[id]?.player_name ?? "—", runs }));
  const topBowlers = [...wktsByPlayer.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, wkts]) => ({ id, name: players[id]?.player_name ?? "—", wkts }));
 
  return (
    <div className="space-y-4">
      {/* Result */}
      {match.status === "completed" && match.result_text && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>Result</div>
          <div className="px-4 py-3 font-display text-lg" style={{ color: CB.orangeText }}>{match.result_text}</div>
        </div>
      )}
 
      {/* MOTM */}
      {motmMember && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>
            <Star className="h-3 w-3 fill-yellow-300 text-yellow-300" /> Man of the Match
          </div>
          <div className="flex items-center gap-4 px-4 py-4 bg-card">
            {motmProfile?.avatar_url ? (
              <img src={motmProfile.avatar_url} alt={motmMember.player_name} className="h-14 w-14 rounded-full object-cover border-2 border-yellow-400/50 shrink-0" />
            ) : (
              <div className="h-14 w-14 grid place-items-center rounded-full shrink-0 font-display text-2xl text-white" style={{ background: CB.green }}>
                {motmMember.player_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-display text-xl">{motmProfile?.full_name ?? motmMember.player_name}</div>
              {motmProfile?.full_name && motmProfile.full_name !== motmMember.player_name && (
                <div className="text-xs text-muted-foreground">{motmMember.player_name}</div>
              )}
              <div className="mt-1 text-xs font-semibold text-yellow-500">⭐ Player of the Match</div>
            </div>
          </div>
        </div>
      )}
 
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top scorers */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>Top Scorers</div>
          {topBatters.length === 0 ? <div className="px-4 py-4 text-sm text-muted-foreground">No batting data yet.</div>
            : topBatters.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/50 ${i % 2 === 1 ? "bg-muted/20" : "bg-card"}`}>
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{r.name}</span>
                <span className="font-display text-lg tabular-nums" style={{ color: CB.orangeText }}>{r.runs}</span>
              </div>
            ))}
        </div>
        {/* Top wicket-takers */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>Top Wicket-Takers</div>
          {topBowlers.length === 0 ? <div className="px-4 py-4 text-sm text-muted-foreground">No bowling data yet.</div>
            : topBowlers.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/50 ${i % 2 === 1 ? "bg-muted/20" : "bg-card"}`}>
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{r.name}</span>
                <span className="font-display text-lg tabular-nums" style={{ color: CB.green }}>{r.wkts}W</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
 
/* ─── Squads ─── */
function SquadsTab({ match, squad }: { match: Match; squad: { a: Member[]; b: Member[] } }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[{ team: match.team_a, players: squad.a }, { team: match.team_b, players: squad.b }].map(({ team, players }) => (
        <div key={team.id} className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: team.jersey_color || CB.green }}>
            <div className="font-display text-base text-white">{team.name}</div>
            <FollowButton entityType="team" entityId={team.id} size="sm" />
          </div>
          <ul className="divide-y divide-border bg-card">
            {players.length === 0
              ? <li className="px-4 py-5 text-center text-xs text-muted-foreground">No players.</li>
              : players.map((p, i) => (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary font-mono text-[11px]">{p.jersey_number ?? "—"}</span>
                  <Link to="/players/$playerId" params={{ playerId: p.id }} className="flex-1 truncate text-sm font-medium hover:text-primary">{p.player_name}</Link>
                  <FollowButton entityType="player" entityId={p.id} size="sm" />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
 
/* ─── Shared UI primitives ─── */
function CbCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>;
}
function CbCardHeader({ label }: { label: string }) {
  return (
    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>
      {label}
    </div>
  );
}
function CbPlayerCell({ label, name, accent }: { label: string; name?: string | null; accent?: boolean }) {
  return (
    <div className={`px-3 py-3 ${accent ? "bg-primary/5" : ""}`}>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 truncate font-semibold text-sm ${accent ? "" : "text-foreground"}`}
        style={accent ? { color: CB.orangeText } : {}}>{name ?? "—"}</div>
    </div>
  );
}
function BallPill({ b }: { b: Ball }) {
  const label = b.is_wicket ? "W"
    : b.extra_type === "wide" ? "wd" : b.extra_type === "noball" ? "nb"
    : b.extra_type === "bye" ? `b${b.runs}` : b.extra_type === "legbye" ? `lb${b.runs}` : String(b.runs);
  const cls = b.is_wicket ? "bg-red-600 text-white"
    : b.runs >= 6 ? "text-white" : b.runs === 4 ? "border border-orange-400/50 text-orange-500 bg-orange-50 dark:bg-orange-400/10"
    : b.extra_type ? "border border-amber-400/40 bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400"
    : "bg-secondary text-foreground";
  return (
    <span className={`grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-1 font-mono text-xs font-bold ${cls}`}
      style={b.runs >= 6 && !b.is_wicket ? { background: CB.orange } : {}}>
      {label}
    </span>
  );
}
function EmptyState({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">{msg}</div>;
}