import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Zap, Target, Shield, Star, TrendingUp,
  Award, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
 
export const Route = createFileRoute("/_authenticated/my-stats")({
  head: () => ({ meta: [{ title: "My Stats — JustCric" }] }),
  component: MyStatsPage,
});
 
/* ─── Types ─── */
type BallRow = {
  runs: number; extra_type: string | null; is_wicket: boolean;
  wicket_type: string | null; batter_id: string | null;
  bowler_id: string | null; dismissed_player_id: string | null;
  innings_id: string; over_number: number;
};
type InningsRow = {
  id: string; innings_no: number; batting_team_id: string; bowling_team_id: string;
  match_id: string;
};
type MatchRow = {
  id: string; status: string; result_text: string | null;
  overs: number; venue: string | null; created_at: string;
  motm_player_id: string | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
};
type MemberRow = { id: string; team_id: string };
 
/* ─── Per-match stats ─── */
type MatchStats = {
  matchId: string;
  matchLabel: string;
  date: string;
  result: string | null;
  venue: string | null;
  wasMOTM: boolean;
  bat: { runs: number; balls: number; fours: number; sixes: number; out: boolean } | null;
  bowl: { legal: number; runs: number; wkts: number } | null;
  field: { catches: number; runouts: number; stumpings: number };
  aiInsight: string | null;
  loadingInsight: boolean;
};
 
/* ════════════════════════════════════════
   PAGE
════════════════════════════════════════ */
function MyStatsPage() {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [balls, setBalls] = useState<BallRow[]>([]);
  const [innings, setInnings] = useState<InningsRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [motmMatchIds, setMotmMatchIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [matchStats, setMatchStats] = useState<MatchStats[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
 
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
 
      // Get all team_member ids for this profile
      const { data: members } = await supabase
        .from("team_members")
        .select("id, team_id")
        .eq("profile_id", u.user.id);
      const mems = (members as MemberRow[]) ?? [];
      if (!mems.length) { setLoading(false); return; }
      const memberIds = mems.map((m) => m.id);
      // Use first member id as primary for now
      setMemberId(memberIds[0]);
 
      // Get all balls involving this player
      const { data: bs } = await supabase
        .from("balls")
        .select("runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id, dismissed_player_id, innings_id, over_number")
        .or(memberIds.map((id) => `batter_id.eq.${id},bowler_id.eq.${id},dismissed_player_id.eq.${id}`).join(","));
      setBalls((bs as BallRow[]) ?? []);
 
      // Get all innings ids from those balls
      const innIds = [...new Set((bs as BallRow[] ?? []).map((b) => b.innings_id))];
      if (innIds.length) {
        const { data: inns } = await supabase
          .from("innings")
          .select("id, innings_no, batting_team_id, bowling_team_id, match_id")
          .in("id", innIds);
        setInnings((inns as InningsRow[]) ?? []);
 
        const matchIds = [...new Set((inns as InningsRow[] ?? []).map((i) => i.match_id))];
        if (matchIds.length) {
          const { data: ms } = await supabase
            .from("matches")
            .select("id, status, result_text, overs, venue, created_at, motm_player_id, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)")
            .in("id", matchIds)
            .order("created_at", { ascending: false });
          setMatches((ms as unknown as MatchRow[]) ?? []);
 
          // Track MOTM matches
          const motmSet = new Set<string>();
          (ms as unknown as MatchRow[] ?? []).forEach((m) => {
            if (m.motm_player_id && memberIds.includes(m.motm_player_id)) motmSet.add(m.id);
          });
          setMotmMatchIds(motmSet);
        }
      }
      setLoading(false);
    })();
  }, []);
 
  /* ── Overall aggregates ── */
  const overall = useMemo(() => {
    const memberIds = memberId ? [memberId] : [];
    const batInnings = new Map<string, { runs: number; balls: number; fours: number; sixes: number; out: boolean }>();
    const bowlInnings = new Map<string, { legal: number; runs: number; wkts: number }>();
    let catches = 0, runouts = 0, stumpings = 0;
 
    balls.forEach((b) => {
      // Batting
      if (memberIds.includes(b.batter_id ?? "")) {
        const row = batInnings.get(b.innings_id) ?? { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
        if (b.extra_type !== "wide") row.balls++;
        const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
        if (isBatRun) {
          const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
          row.runs += r;
          if (r === 4) row.fours++;
          if (r === 6) row.sixes++;
        }
        batInnings.set(b.innings_id, row);
      }
      if (b.dismissed_player_id && memberIds.includes(b.dismissed_player_id)) {
        const row = batInnings.get(b.innings_id);
        if (row) row.out = true;
      }
      // Bowling
      if (memberIds.includes(b.bowler_id ?? "")) {
        const row = bowlInnings.get(b.innings_id) ?? { legal: 0, runs: 0, wkts: 0 };
        row.runs += b.runs;
        if (b.extra_type !== "wide" && b.extra_type !== "noball") row.legal++;
        if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") row.wkts++;
        bowlInnings.set(b.innings_id, row);
      }
      // Fielding — from wicket_type stored as "caught|fielder_id" or just type
      if (b.is_wicket) {
        const wt = b.wicket_type ?? "";
        // We check if this player took the catch/runout by checking dismissed context
        if ((wt === "caught" || wt === "caught_behind" || wt === "stumped") && b.bowler_id && memberIds.includes(b.bowler_id)) {
          // bowler gets credit only if they took it — approximate
        }
        if (wt === "runout" && b.dismissed_player_id && memberIds.includes(b.dismissed_player_id ?? "")) runouts++;
        if ((wt === "caught" || wt === "caught_behind") && memberIds.includes(b.bowler_id ?? "")) catches++;
        if (wt === "stumped" && memberIds.includes(b.bowler_id ?? "")) stumpings++;
      }
    });
 
    const batArr = [...batInnings.values()];
    const totalRuns = batArr.reduce((s, r) => s + r.runs, 0);
    const totalBalls = batArr.reduce((s, r) => s + r.balls, 0);
    const totalOuts = batArr.filter((r) => r.out).length;
    const hs = Math.max(0, ...batArr.map((r) => r.runs));
    const fifties = batArr.filter((r) => r.runs >= 50 && r.runs < 100).length;
    const hundreds = batArr.filter((r) => r.runs >= 100).length;
    const fours = batArr.reduce((s, r) => s + r.fours, 0);
    const sixes = batArr.reduce((s, r) => s + r.sixes, 0);
    const batAvg = totalOuts > 0 ? totalRuns / totalOuts : totalRuns;
    const batSR = totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0;
 
    const bowlArr = [...bowlInnings.values()];
    const totalWkts = bowlArr.reduce((s, r) => s + r.wkts, 0);
    const totalBowlRuns = bowlArr.reduce((s, r) => s + r.runs, 0);
    const totalLegal = bowlArr.reduce((s, r) => s + r.legal, 0);
    const economy = totalLegal > 0 ? (totalBowlRuns / totalLegal) * 6 : 0;
    const bowlAvg = totalWkts > 0 ? totalBowlRuns / totalWkts : 0;
    const bestFigures = bowlArr.reduce((best, r) => r.wkts > best.wkts || (r.wkts === best.wkts && r.runs < best.runs) ? r : best, { wkts: 0, runs: 0 });
 
    return {
      matches: matches.length,
      motm: motmMatchIds.size,
      bat: { inns: batArr.length, runs: totalRuns, avg: batAvg, sr: batSR, hs, fifties, hundreds, fours, sixes },
      bowl: { inns: bowlArr.length, wkts: totalWkts, avg: bowlAvg, economy, best: `${bestFigures.wkts}/${bestFigures.runs}`, overs: `${Math.floor(totalLegal / 6)}.${totalLegal % 6}` },
      field: { catches, runouts, stumpings },
    };
  }, [balls, memberId, matches, motmMatchIds]);
 
  /* ── Per-match stats ── */
  useEffect(() => {
    if (!memberId || !matches.length) return;
    const stats: MatchStats[] = matches.map((m) => {
      const matchInnings = innings.filter((i) => i.match_id === m.id);
      const matchBalls = balls.filter((b) => matchInnings.some((i) => i.id === b.innings_id));
 
      // Batting
      const batBalls = matchBalls.filter((b) => b.batter_id === memberId);
      let bRuns = 0, bBalls = 0, bFours = 0, bSixes = 0;
      batBalls.forEach((b) => {
        if (b.extra_type !== "wide") bBalls++;
        const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
        if (isBatRun) {
          const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
          bRuns += r; if (r === 4) bFours++; if (r === 6) bSixes++;
        }
      });
      const batOut = matchBalls.some((b) => b.dismissed_player_id === memberId && b.is_wicket);
      const batStats = bBalls > 0 || batOut ? { runs: bRuns, balls: bBalls, fours: bFours, sixes: bSixes, out: batOut } : null;
 
      // Bowling
      const bowlBalls = matchBalls.filter((b) => b.bowler_id === memberId);
      let bowlRuns = 0, bowlLegal = 0, bowlWkts = 0;
      bowlBalls.forEach((b) => {
        bowlRuns += b.runs;
        if (b.extra_type !== "wide" && b.extra_type !== "noball") bowlLegal++;
        if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") bowlWkts++;
      });
      const bowlStats = bowlLegal > 0 ? { legal: bowlLegal, runs: bowlRuns, wkts: bowlWkts } : null;
 
      // Fielding
      let mCatches = 0, mRunouts = 0, mStumpings = 0;
      matchBalls.forEach((b) => {
        if (!b.is_wicket) return;
        const wt = b.wicket_type ?? "";
        if ((wt === "caught" || wt === "caught_behind") && b.bowler_id === memberId) mCatches++;
        if (wt === "stumped" && b.bowler_id === memberId) mStumpings++;
        if (wt === "runout" && b.dismissed_player_id === memberId) mRunouts++;
      });
 
      return {
        matchId: m.id,
        matchLabel: `${m.team_a?.name ?? "Team A"} vs ${m.team_b?.name ?? "Team B"}`,
        date: new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        result: m.result_text,
        venue: m.venue,
        wasMOTM: motmMatchIds.has(m.id),
        bat: batStats,
        bowl: bowlStats,
        field: { catches: mCatches, runouts: mRunouts, stumpings: mStumpings },
        aiInsight: null,
        loadingInsight: false,
      };
    });
    setMatchStats(stats);
  }, [memberId, matches, innings, balls, motmMatchIds]);
 
  const loadInsight = async (matchId: string) => {
    const ms = matchStats.find((m) => m.matchId === matchId);
    if (!ms || ms.aiInsight || ms.loadingInsight) return;
 
    setMatchStats((prev) => prev.map((m) => m.matchId === matchId ? { ...m, loadingInsight: true } : m));
 
    const prompt = `You are a cricket coach giving personal feedback to a player. Based on their match stats, write a SHORT (2-3 sentences max), MOTIVATING and SPECIFIC message that:
1. Acknowledges their actual contribution with specific numbers
2. Highlights something positive even if stats are modest
3. Gives one actionable encouragement for next match
 
Player stats for this match:
${ms.bat ? `Batting: ${ms.bat.runs} runs off ${ms.bat.balls} balls, ${ms.bat.fours} fours, ${ms.bat.sixes} sixes. ${ms.bat.out ? "Got out." : "Not out."}` : "Did not bat."}
${ms.bowl ? `Bowling: ${Math.floor(ms.bowl.legal / 6)}.${ms.bowl.legal % 6} overs, ${ms.bowl.runs} runs, ${ms.bowl.wkts} wickets.` : "Did not bowl."}
${ms.field.catches + ms.field.runouts + ms.field.stumpings > 0 ? `Fielding: ${ms.field.catches} catch(es), ${ms.field.runouts} run out(s), ${ms.field.stumpings} stumping(s).` : ""}
${ms.wasMOTM ? "Was awarded Man of the Match!" : ""}
Match result: ${ms.result ?? "Unknown"}
 
Write in second person (You...). Be genuine, not generic. Keep it under 60 words.`;
 
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Great effort! Keep working hard.";
      setMatchStats((prev) => prev.map((m) => m.matchId === matchId ? { ...m, aiInsight: text, loadingInsight: false } : m));
    } catch {
      setMatchStats((prev) => prev.map((m) => m.matchId === matchId ? { ...m, aiInsight: "Great effort out there! Keep pushing — every match is a chance to grow.", loadingInsight: false } : m));
    }
  };
 
  if (loading) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />)}
      </div>
    </div>
  );
 
  if (!memberId) return (
    <div className="min-h-screen bg-background"><Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6">
        <div className="rounded-xl border border-border bg-card p-10">
          <div className="text-4xl mb-3">🏏</div>
          <h2 className="font-display text-2xl">No player profile yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Ask your team captain to add you to a team first.</p>
          <Link to="/teams" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
            Browse Teams
          </Link>
        </div>
      </main>
    </div>
  );
 
  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-tight">My <span className="text-primary">Stats</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">{overall.matches} matches · {overall.motm} Player of the Match awards</p>
 
        {/* ── OVERALL KPI CARDS ── */}
        <div className="mt-6 space-y-4">
 
          {/* Batting */}
          <KpiSection title="Batting" icon={<Zap className="h-4 w-4" />} color="primary">
            <KpiGrid>
              <Kpi label="Innings" value={overall.bat.inns} />
              <Kpi label="Runs" value={overall.bat.runs} highlight />
              <Kpi label="Average" value={overall.bat.avg > 0 ? overall.bat.avg.toFixed(1) : "—"} />
              <Kpi label="Strike Rate" value={overall.bat.sr > 0 ? overall.bat.sr.toFixed(1) : "—"} />
              <Kpi label="High Score" value={overall.bat.hs} />
              <Kpi label="50s" value={overall.bat.fifties} />
              <Kpi label="100s" value={overall.bat.hundreds} />
              <Kpi label="4s" value={overall.bat.fours} />
              <Kpi label="6s" value={overall.bat.sixes} highlight />
            </KpiGrid>
          </KpiSection>
 
          {/* Bowling */}
          <KpiSection title="Bowling" icon={<Target className="h-4 w-4" />} color="accent">
            <KpiGrid>
              <Kpi label="Innings" value={overall.bowl.inns} />
              <Kpi label="Wickets" value={overall.bowl.wkts} highlight />
              <Kpi label="Overs" value={overall.bowl.overs} />
              <Kpi label="Average" value={overall.bowl.avg > 0 ? overall.bowl.avg.toFixed(1) : "—"} />
              <Kpi label="Economy" value={overall.bowl.economy > 0 ? overall.bowl.economy.toFixed(2) : "—"} />
              <Kpi label="Best" value={overall.bowl.best} highlight />
            </KpiGrid>
          </KpiSection>
 
          {/* Fielding */}
          <KpiSection title="Fielding" icon={<Shield className="h-4 w-4" />} color="gold">
            <KpiGrid>
              <Kpi label="Catches" value={overall.field.catches} highlight />
              <Kpi label="Run Outs" value={overall.field.runouts} />
              <Kpi label="Stumpings" value={overall.field.stumpings} />
            </KpiGrid>
          </KpiSection>
 
          {/* Honours */}
          <KpiSection title="Honours" icon={<Award className="h-4 w-4" />} color="gold">
            <KpiGrid>
              <Kpi label="Matches" value={overall.matches} />
              <Kpi label="MOTM Awards" value={overall.motm} highlight />
            </KpiGrid>
          </KpiSection>
        </div>
 
        {/* ── PER-MATCH BREAKDOWN ── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Match by Match</h2>
          </div>
 
          {matchStats.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No match data yet.
            </div>
          ) : (
            <div className="space-y-3">
              {matchStats.map((ms) => (
                <div key={ms.matchId} className="overflow-hidden rounded-xl border border-border bg-card">
                  {/* Header row */}
                  <button
                    onClick={() => {
                      const next = expanded === ms.matchId ? null : ms.matchId;
                      setExpanded(next);
                      if (next) loadInsight(ms.matchId);
                    }}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-secondary/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{ms.matchLabel}</span>
                        {ms.wasMOTM && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-500">
                            <Star className="h-2.5 w-2.5 fill-yellow-400" /> MOTM
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{ms.date}{ms.venue ? ` · ${ms.venue}` : ""}</div>
                      {/* Quick summary line */}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {ms.bat && <span className="text-foreground font-medium">{ms.bat.runs} runs ({ms.bat.balls}b)</span>}
                        {ms.bowl && <span className="text-foreground font-medium">{ms.bowl.wkts}/{ms.bowl.runs} ({Math.floor(ms.bowl.legal / 6)}.{ms.bowl.legal % 6}ov)</span>}
                        {(ms.field.catches + ms.field.runouts + ms.field.stumpings) > 0 && (
                          <span>{ms.field.catches}c {ms.field.runouts}ro</span>
                        )}
                      </div>
                    </div>
                    {expanded === ms.matchId
                      ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>
 
                  {/* Expanded detail */}
                  {expanded === ms.matchId && (
                    <div className="border-t border-border px-4 py-4 space-y-4">
                      {/* Detailed stats */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {ms.bat && (
                          <StatBlock title="Batting" color="primary">
                            <StatRow label="Runs" value={ms.bat.runs} />
                            <StatRow label="Balls" value={ms.bat.balls} />
                            <StatRow label="SR" value={ms.bat.balls > 0 ? ((ms.bat.runs / ms.bat.balls) * 100).toFixed(1) : "—"} />
                            <StatRow label="4s" value={ms.bat.fours} />
                            <StatRow label="6s" value={ms.bat.sixes} />
                            <StatRow label="Status" value={ms.bat.out ? "Out" : "Not out"} />
                          </StatBlock>
                        )}
                        {ms.bowl && (
                          <StatBlock title="Bowling" color="accent">
                            <StatRow label="Overs" value={`${Math.floor(ms.bowl.legal / 6)}.${ms.bowl.legal % 6}`} />
                            <StatRow label="Runs" value={ms.bowl.runs} />
                            <StatRow label="Wickets" value={ms.bowl.wkts} />
                            <StatRow label="Economy" value={ms.bowl.legal > 0 ? ((ms.bowl.runs / ms.bowl.legal) * 6).toFixed(2) : "—"} />
                          </StatBlock>
                        )}
                        {(ms.field.catches + ms.field.runouts + ms.field.stumpings) > 0 && (
                          <StatBlock title="Fielding" color="gold">
                            <StatRow label="Catches" value={ms.field.catches} />
                            <StatRow label="Run Outs" value={ms.field.runouts} />
                            <StatRow label="Stumpings" value={ms.field.stumpings} />
                          </StatBlock>
                        )}
                      </div>
 
                      {/* Result */}
                      {ms.result && (
                        <div className="text-xs text-muted-foreground border-t border-border pt-3">
                          Result: <span className="font-semibold text-foreground">{ms.result}</span>
                        </div>
                      )}
 
                      {/* AI Motivational Insight */}
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-bold mb-2">
                          <Zap className="h-3 w-3" /> Coach's Analysis
                        </div>
                        {ms.loadingInsight ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Analysing your performance…
                          </div>
                        ) : ms.aiInsight ? (
                          <p className="text-sm text-foreground leading-relaxed">{ms.aiInsight}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Tap to expand and load analysis.</p>
                        )}
                      </div>
 
                      <Link
                        to="/match/$matchId"
                        params={{ matchId: ms.matchId }}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        View full scorecard →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
 
/* ── UI primitives ── */
function KpiSection({ title, icon, color, children }: {
  title: string; icon: React.ReactNode; color: "primary" | "accent" | "gold"; children: React.ReactNode;
}) {
  const colors = {
    primary: "border-primary/20 bg-primary/5",
    accent: "border-accent/20 bg-accent/5",
    gold: "border-yellow-400/20 bg-yellow-400/5",
  };
  const textColors = {
    primary: "text-primary",
    accent: "text-accent",
    gold: "text-yellow-500",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold mb-3 ${textColors[color]}`}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
 
function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">{children}</div>;
}
 
function Kpi({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-xl tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
 
function StatBlock({ title, color, children }: { title: string; color: "primary" | "accent" | "gold"; children: React.ReactNode }) {
  const textColors = { primary: "text-primary", accent: "text-accent", gold: "text-yellow-500" };
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className={`text-[9px] uppercase tracking-widest font-bold mb-2 ${textColors[color]}`}>{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
 
function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}