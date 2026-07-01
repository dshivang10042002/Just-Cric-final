import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Zap, Target, Shield, Star, TrendingUp, TrendingDown,
  Award, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/_authenticated/my-stats")({
  head: () => ({ meta: [{ title: "My Stats — JustCric" }] }),
  component: MyStatsPage,
});

type BallRow = {
  runs: number; extra_type: string | null; is_wicket: boolean;
  wicket_type: string | null; batter_id: string | null;
  bowler_id: string | null; dismissed_player_id: string | null;
  innings_id: string; over_number: number;
};
type InningsRow = {
  id: string; innings_no: number; batting_team_id: string;
  bowling_team_id: string; match_id: string;
};
type MatchRow = {
  id: string; status: string; result_text: string | null;
  overs: number; venue: string | null; created_at: string;
  motm_player_id: string | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
};
type MemberRow = { id: string; team_id: string };
type MatchStats = {
  matchId: string; matchLabel: string; date: string;
  result: string | null; venue: string | null; wasMOTM: boolean;
  bat: { runs: number; balls: number; fours: number; sixes: number; out: boolean } | null;
  bowl: { legal: number; runs: number; wkts: number } | null;
  field: { catches: number; runouts: number; stumpings: number };
  aiInsight: string | null; loadingInsight: boolean;
};

/* ─── Gradient colours ─── */
const G = {
  bat:   { from: "#003527", to: "#06d6a0" },
  bowl:  { from: "#7c3aed", to: "#a78bfa" },
  field: { from: "#d97706", to: "#fbbf24" },
  motm:  { from: "#b45309", to: "#fde68a" },
};

/* ─── Stat tile with gradient bg ─── */
function StatTile({
  label, value, sub, gradient, trend, icon,
}: {
  label: string; value: string | number; sub?: string;
  gradient: { from: string; to: string };
  trend?: "up" | "down" | null; icon?: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 text-white shadow-lg"
      style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">{label}</div>
        {icon && <span className="text-white/60">{icon}</span>}
      </div>
      <div className="mt-2 font-display text-4xl font-bold tabular-nums leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs text-white/70">{sub}</div>}
      {trend && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${trend === "up" ? "text-green-300" : "text-red-300"}`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend === "up" ? "Improving" : "Needs work"}
        </div>
      )}
    </div>
  );
}

/* ─── Chart section wrapper ─── */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</div>
      {children}
    </div>
  );
}

/* ─── Custom tooltip ─── */
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold mb-1 text-foreground">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-muted-foreground">{p.name}: <b className="text-foreground">{p.value}</b></div>
      ))}
    </div>
  );
}

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
      const { data: members } = await supabase
        .from("team_members").select("id, team_id").eq("profile_id", u.user.id);
      const mems = (members as MemberRow[]) ?? [];
      if (!mems.length) { setLoading(false); return; }
      const memberIds = mems.map((m) => m.id);
      setMemberId(memberIds[0]);

      const { data: bs } = await supabase.from("balls")
        .select("runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id, dismissed_player_id, innings_id, over_number")
        .or(memberIds.map((id) => `batter_id.eq.${id},bowler_id.eq.${id},dismissed_player_id.eq.${id}`).join(","));
      setBalls((bs as BallRow[]) ?? []);

      const innIds = [...new Set((bs as BallRow[] ?? []).map((b) => b.innings_id))];
      if (innIds.length) {
        const { data: inns } = await supabase.from("innings")
          .select("id, innings_no, batting_team_id, bowling_team_id, match_id").in("id", innIds);
        setInnings((inns as InningsRow[]) ?? []);
        const matchIds = [...new Set((inns as InningsRow[] ?? []).map((i) => i.match_id))];
        if (matchIds.length) {
          const { data: ms } = await supabase.from("matches")
            .select("id, status, result_text, overs, venue, created_at, motm_player_id, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)")
            .in("id", matchIds).order("created_at", { ascending: false });
          setMatches((ms as unknown as MatchRow[]) ?? []);
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
      if (memberIds.includes(b.bowler_id ?? "")) {
        const row = bowlInnings.get(b.innings_id) ?? { legal: 0, runs: 0, wkts: 0 };
        row.runs += b.runs;
        if (b.extra_type !== "wide" && b.extra_type !== "noball") row.legal++;
        if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") row.wkts++;
        bowlInnings.set(b.innings_id, row);
      }
      if (b.is_wicket) {
        const wt = b.wicket_type ?? "";
        if (wt === "runout" && b.dismissed_player_id && memberIds.includes(b.dismissed_player_id ?? "")) runouts++;
        if ((wt === "caught" || wt === "caught_behind") && b.bowler_id && memberIds.includes(b.bowler_id)) catches++;
        if (wt === "stumped" && b.bowler_id && memberIds.includes(b.bowler_id)) stumpings++;
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
    const batAvg = totalOuts > 0 ? +(totalRuns / totalOuts).toFixed(1) : totalRuns;
    const batSR = totalBalls > 0 ? +((totalRuns / totalBalls) * 100).toFixed(1) : 0;

    const bowlArr = [...bowlInnings.values()];
    const totalWkts = bowlArr.reduce((s, r) => s + r.wkts, 0);
    const totalBowlRuns = bowlArr.reduce((s, r) => s + r.runs, 0);
    const totalLegal = bowlArr.reduce((s, r) => s + r.legal, 0);
    const economy = totalLegal > 0 ? +((totalBowlRuns / totalLegal) * 6).toFixed(2) : 0;
    const bowlAvg = totalWkts > 0 ? +(totalBowlRuns / totalWkts).toFixed(1) : 0;
    const bestFig = bowlArr.reduce(
      (best, r) => r.wkts > best.wkts || (r.wkts === best.wkts && r.runs < best.runs) ? r : best,
      { wkts: 0, runs: 0 }
    );

    return {
      matches: matches.length, motm: motmMatchIds.size,
      bat: { inns: batArr.length, runs: totalRuns, avg: batAvg, sr: batSR, hs, fifties, hundreds, fours, sixes },
      bowl: { inns: bowlArr.length, wkts: totalWkts, avg: bowlAvg, economy, best: `${bestFig.wkts}/${bestFig.runs}`, overs: `${Math.floor(totalLegal / 6)}.${totalLegal % 6}` },
      field: { catches, runouts, stumpings },
    };
  }, [balls, memberId, matches, motmMatchIds]);

  /* ── Per-match stats ── */
  useEffect(() => {
    if (!memberId || !matches.length) return;
    const allMyIds = [memberId];
    const stats: MatchStats[] = matches.map((m) => {
      const matchInnings = innings.filter((i) => i.match_id === m.id);
      const matchBalls = balls.filter((b) => matchInnings.some((i) => i.id === b.innings_id));

      const batBalls = matchBalls.filter((b) => allMyIds.includes(b.batter_id ?? ""));
      let bRuns = 0, bBalls = 0, bFours = 0, bSixes = 0;
      batBalls.forEach((b) => {
        if (b.extra_type !== "wide") bBalls++;
        const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
        if (isBatRun) {
          const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
          bRuns += r; if (r === 4) bFours++; if (r === 6) bSixes++;
        }
      });
      const batOut = matchBalls.some((b) => allMyIds.includes(b.dismissed_player_id ?? "") && b.is_wicket);
      const batStats = bBalls > 0 || batOut ? { runs: bRuns, balls: bBalls, fours: bFours, sixes: bSixes, out: batOut } : null;

      const bowlBalls = matchBalls.filter((b) => allMyIds.includes(b.bowler_id ?? ""));
      let bowlRuns = 0, bowlLegal = 0, bowlWkts = 0;
      bowlBalls.forEach((b) => {
        bowlRuns += b.runs;
        if (b.extra_type !== "wide" && b.extra_type !== "noball") bowlLegal++;
        if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") bowlWkts++;
      });
      const bowlStats = bowlLegal > 0 ? { legal: bowlLegal, runs: bowlRuns, wkts: bowlWkts } : null;

      let mCatches = 0, mRunouts = 0, mStumpings = 0;
      matchBalls.forEach((b) => {
        if (!b.is_wicket) return;
        const wt = b.wicket_type ?? "";
        if ((wt === "caught" || wt === "caught_behind") && allMyIds.includes(b.bowler_id ?? "")) mCatches++;
        if (wt === "stumped" && allMyIds.includes(b.bowler_id ?? "")) mStumpings++;
        if (wt === "runout" && allMyIds.includes(b.dismissed_player_id ?? "")) mRunouts++;
      });

      return {
        matchId: m.id,
        matchLabel: `${m.team_a?.name ?? "Team A"} vs ${m.team_b?.name ?? "Team B"}`,
        date: new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        result: m.result_text, venue: m.venue,
        wasMOTM: motmMatchIds.has(m.id),
        bat: batStats, bowl: bowlStats,
        field: { catches: mCatches, runouts: mRunouts, stumpings: mStumpings },
        aiInsight: null, loadingInsight: false,
      };
    });
    setMatchStats(stats);
  }, [memberId, matches, innings, balls, motmMatchIds]);

  const loadInsight = async (matchId: string) => {
    const ms = matchStats.find((m) => m.matchId === matchId);
    if (!ms || ms.aiInsight || ms.loadingInsight) return;
    setMatchStats((prev) => prev.map((m) => m.matchId === matchId ? { ...m, loadingInsight: true } : m));
    const prompt = `You are a cricket coach giving personal feedback. Based on their stats, write a SHORT (2-3 sentences), MOTIVATING and SPECIFIC message.
${ms.bat ? `Batting: ${ms.bat.runs} runs off ${ms.bat.balls} balls, ${ms.bat.fours} fours, ${ms.bat.sixes} sixes. ${ms.bat.out ? "Got out." : "Not out."}` : "Did not bat."}
${ms.bowl ? `Bowling: ${Math.floor(ms.bowl.legal / 6)}.${ms.bowl.legal % 6} overs, ${ms.bowl.runs} runs, ${ms.bowl.wkts} wickets.` : "Did not bowl."}
${ms.field.catches + ms.field.runouts + ms.field.stumpings > 0 ? `Fielding: ${ms.field.catches} catch(es), ${ms.field.runouts} run out(s), ${ms.field.stumpings} stumping(s).` : ""}
${ms.wasMOTM ? "Was awarded Man of the Match!" : ""}
Match result: ${ms.result ?? "Unknown"}
Write in second person. Be genuine, specific and under 60 words.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Great effort! Keep working hard.";
      setMatchStats((prev) => prev.map((m) => m.matchId === matchId ? { ...m, aiInsight: text, loadingInsight: false } : m));
    } catch {
      setMatchStats((prev) => prev.map((m) => m.matchId === matchId ? { ...m, aiInsight: "Great effort out there! Keep pushing.", loadingInsight: false } : m));
    }
  };

  /* ── Chart data ── */
  const radarData = useMemo(() => {
    if (!overall.matches) return [];
    const batScore = Math.min(100, overall.bat.sr > 0 ? overall.bat.sr / 2 : 0);
    const runScore = Math.min(100, (overall.bat.runs / Math.max(1, overall.bat.inns)) * 2);
    const wktScore = Math.min(100, overall.bowl.wkts * 8);
    const econScore = overall.bowl.economy > 0 ? Math.max(0, 100 - (overall.bowl.economy - 4) * 15) : 0;
    const fieldScore = Math.min(100, (overall.field.catches + overall.field.runouts + overall.field.stumpings) * 15);
    const motmScore = Math.min(100, overall.motm * 25);
    return [
      { subject: "Batting", value: Math.round(batScore) },
      { subject: "Scoring", value: Math.round(runScore) },
      { subject: "Bowling", value: Math.round(wktScore) },
      { subject: "Economy", value: Math.round(econScore) },
      { subject: "Fielding", value: Math.round(fieldScore) },
      { subject: "MVP", value: Math.round(motmScore) },
    ];
  }, [overall]);

  const runsPerMatch = useMemo(() =>
    [...matchStats].reverse().slice(-8).map((m, i) => ({
      match: `M${i + 1}`,
      runs: m.bat?.runs ?? 0,
      wkts: m.bowl?.wkts ?? 0,
      label: m.matchLabel.split(" vs ")[0].slice(0, 8),
    })),
    [matchStats]
  );

  const avgRunsTrend = useMemo(() => {
    const arr = [...matchStats].reverse();
    let cumRuns = 0, cumInns = 0;
    return arr.slice(-8).map((m, i) => {
      if (m.bat) { cumRuns += m.bat.runs; cumInns++; }
      return { match: `M${i + 1}`, avg: cumInns > 0 ? +(cumRuns / cumInns).toFixed(1) : 0 };
    });
  }, [matchStats]);

  if (loading) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-3">
        {[0,1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />)}
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

  const hasAnyData = overall.matches > 0;

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <h1 className="mt-3 font-display text-4xl tracking-tight">
          My <span className="text-primary">Stats</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {overall.matches} matches · {overall.motm} MOTM award{overall.motm !== 1 ? "s" : ""}
        </p>

        {!hasAnyData ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h2 className="font-display text-xl">No match data yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Play a match to see your stats here.</p>
          </div>
        ) : (
          <>
            {/* ── TOP: 2×2 Gradient Stat Tiles ── */}
            <section className="mt-6 grid grid-cols-2 gap-3">
              <StatTile label="Runs Scored" value={overall.bat.runs}
                sub={`Avg ${overall.bat.avg} · SR ${overall.bat.sr}`}
                gradient={G.bat} trend={overall.bat.sr > 100 ? "up" : null}
                icon={<Zap className="h-4 w-4" />} />
              <StatTile label="Wickets" value={overall.bowl.wkts}
                sub={`Economy ${overall.bowl.economy > 0 ? overall.bowl.economy : "—"}`}
                gradient={G.bowl} trend={overall.bowl.economy < 7 && overall.bowl.wkts > 0 ? "up" : null}
                icon={<Target className="h-4 w-4" />} />
              <StatTile label="Catches" value={overall.field.catches + overall.field.runouts + overall.field.stumpings}
                sub={`${overall.field.catches}c · ${overall.field.runouts}ro · ${overall.field.stumpings}st`}
                gradient={G.field} icon={<Shield className="h-4 w-4" />} />
              <StatTile label="MOTM Awards" value={overall.motm}
                sub={`${overall.matches} matches played`}
                gradient={G.motm} trend={overall.motm > 0 ? "up" : null}
                icon={<Star className="h-4 w-4" />} />
            </section>

            {/* ── Detailed stat rows ── */}
            <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "High Score", v: overall.bat.hs },
                { l: "50s / 100s", v: `${overall.bat.fifties} / ${overall.bat.hundreds}` },
                { l: "Fours", v: overall.bat.fours },
                { l: "Sixes", v: overall.bat.sixes },
                { l: "Overs Bowled", v: overall.bowl.overs },
                { l: "Best Figures", v: overall.bowl.best },
                { l: "Bowl Average", v: overall.bowl.avg > 0 ? overall.bowl.avg : "—" },
                { l: "Innings Bat", v: overall.bat.inns },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-border bg-card px-3 py-2.5 text-center">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
                  <div className="mt-1 font-display text-xl tabular-nums text-foreground">{s.v}</div>
                </div>
              ))}
            </section>

            {/* ── CHARTS ── */}
            {radarData.length > 0 && (
              <section className="mt-6 grid gap-4 md:grid-cols-2">

                {/* Radar chart */}
                <ChartCard title="Skill Radar">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Radar name="You" dataKey="value" stroke="#003527" fill="#003527" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartCard>

                {/* Bar chart: runs + wickets per match */}
                {runsPerMatch.length > 0 && (
                  <ChartCard title="Runs & Wickets per Match">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={runsPerMatch} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="match" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="runs" name="Runs" fill="#003527" radius={[4,4,0,0]} />
                        <Bar dataKey="wkts" name="Wickets" fill="#7c3aed" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {/* Line chart: batting average trend */}
                {avgRunsTrend.length > 1 && (
                  <ChartCard title="Batting Average Trend">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={avgRunsTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="match" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={overall.bat.avg} stroke="#003527" strokeDasharray="4 2" label={{ value: "Career Avg", fontSize: 9, fill: "#003527" }} />
                        <Line type="monotone" dataKey="avg" name="Avg" stroke="#06d6a0" strokeWidth={2.5} dot={{ r: 4, fill: "#06d6a0" }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </section>
            )}
          </>
        )}

        {/* ── MATCH BY MATCH ── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Match by Match</h2>
          </div>

          {matchStats.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">No match data yet.</div>
          ) : (
            <div className="space-y-3">
              {matchStats.map((ms) => (
                <div key={ms.matchId} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button
                    onClick={() => { const next = expanded === ms.matchId ? null : ms.matchId; setExpanded(next); if (next) loadInsight(ms.matchId); }}
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

                  {expanded === ms.matchId && (
                    <div className="border-t border-border px-4 py-4 space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {ms.bat && (
                          <div className="rounded-xl border border-border bg-background p-3">
                            <div className="text-[9px] uppercase tracking-widest font-bold text-primary mb-2">Batting</div>
                            {[["Runs", ms.bat.runs], ["Balls", ms.bat.balls], ["SR", ms.bat.balls > 0 ? ((ms.bat.runs / ms.bat.balls) * 100).toFixed(1) : "—"], ["4s", ms.bat.fours], ["6s", ms.bat.sixes], ["Status", ms.bat.out ? "Out" : "Not out"]].map(([l, v]) => (
                              <div key={l as string} className="flex items-center justify-between text-xs py-0.5">
                                <span className="text-muted-foreground">{l}</span>
                                <span className="font-semibold tabular-nums">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {ms.bowl && (
                          <div className="rounded-xl border border-border bg-background p-3">
                            <div className="text-[9px] uppercase tracking-widest font-bold text-accent mb-2">Bowling</div>
                            {[["Overs", `${Math.floor(ms.bowl.legal / 6)}.${ms.bowl.legal % 6}`], ["Runs", ms.bowl.runs], ["Wickets", ms.bowl.wkts], ["Economy", ms.bowl.legal > 0 ? ((ms.bowl.runs / ms.bowl.legal) * 6).toFixed(2) : "—"]].map(([l, v]) => (
                              <div key={l as string} className="flex items-center justify-between text-xs py-0.5">
                                <span className="text-muted-foreground">{l}</span>
                                <span className="font-semibold tabular-nums">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(ms.field.catches + ms.field.runouts + ms.field.stumpings) > 0 && (
                          <div className="rounded-xl border border-border bg-background p-3">
                            <div className="text-[9px] uppercase tracking-widest font-bold text-amber-500 mb-2">Fielding</div>
                            {[["Catches", ms.field.catches], ["Run Outs", ms.field.runouts], ["Stumpings", ms.field.stumpings]].map(([l, v]) => (
                              <div key={l as string} className="flex items-center justify-between text-xs py-0.5">
                                <span className="text-muted-foreground">{l}</span>
                                <span className="font-semibold">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {ms.result && (
                        <div className="text-xs text-muted-foreground border-t border-border pt-3">
                          Result: <span className="font-semibold text-foreground">{ms.result}</span>
                        </div>
                      )}

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
                          <p className="text-sm text-muted-foreground italic">Expand to load coaching insight.</p>
                        )}
                      </div>

                      <Link to="/match/$matchId" params={{ matchId: ms.matchId }}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
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