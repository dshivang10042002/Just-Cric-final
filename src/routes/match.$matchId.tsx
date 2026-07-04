import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { Radio, Star, Zap, Loader2 } from "lucide-react";
import { VideoStreamEmbed } from "@/components/VideoStreamEmbed";
import { LiveBroadcastOverlay } from "@/components/live-overlay/LiveBroadcastOverlay";
import { PlayerAvatarChip, RoleBadge } from "@/components/PlayerAvatarChip";

/* ─── Player link — wraps a player's name so it opens their profile ─── */
function PlayerLink({ id, name, className, fallback = "—" }: { id?: string | null; name?: string | null; className?: string; fallback?: string }) {
  if (!id) return <span className={className}>{name ?? fallback}</span>;
  return (
    <Link
      to="/players/$playerId"
      params={{ playerId: id }}
      onClick={(e) => e.stopPropagation()}
      className={className ?? "text-[#0284c7] font-semibold hover:underline"}
    >
      {name ?? fallback}
    </Link>
  );
}

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
  created_at: string | null; completed_at: string | null;
  stream_url: string | null; stream_status: "idle" | "live" | "ended";
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
  batter_id: string | null; non_striker_id: string | null; bowler_id: string | null; dismissed_player_id: string | null;
};
type Member = {
  id: string; player_name: string; team_id: string; jersey_number: number | null;
  avatar_url?: string | null; role?: string | null;
  batting_style?: string | null; bowling_style?: string | null;
  is_captain?: boolean; is_wicketkeeper?: boolean;
};
type MotmProfile = { id: string; full_name: string | null; avatar_url: string | null };
type Tab = "info" | "live" | "scorecard" | "commentary" | "summary" | "squads";

const TABS: { id: Tab; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "live", label: "Live" },
  { id: "scorecard", label: "Scorecard" },
  { id: "commentary", label: "Commentary" },
  { id: "summary", label: "Summary" },
  { id: "squads", label: "Squads" },
];

/* ─── Cricbuzz colour tokens ─── */
const CB = {
  // Colors matched exactly to the provided scorecard design
  green: "#009270",       // header / innings bar green (from design)
  greenDark: "#00785d",
  greenTab: "#009270",
  link: "#0284c7",         // player name link blue (from design)
  orange: "#f7941d",       // kept for live badge / big-hit highlights elsewhere
  orangeText: "#e8870f",
  headerText: "#ffffff",
  tableHeader: "#f3f4f6",  // gray-100 — plain table header bg (from design)
  rowAlt: "#f9fafb",       // gray-50 — hover row bg (from design)
  rowHover: "#f9fafb",
  border: "#e5e7eb",       // gray-200 (from design)
  muted: "#6b7280",        // gray-500
  livePill: "#e53e3e",
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
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [myInsight, setMyInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Load logged-in user's member id for this match
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id;
      if (!userId) return;
      const { data: mems } = await supabase
        .from("team_members")
        .select("id")
        .eq("profile_id", userId);
      if (mems?.length) setMyMemberId((mems as { id: string }[])[0].id);
    });
  }, []);

  const load = async () => {
    const { data: m } = await supabase
      .from("matches")
      .select("id, overs, venue, status, current_innings, result_text, motm_player_id, created_at, completed_at, stream_url, stream_status, team_a:teams!matches_team_a_id_fkey(id, name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(id, name, short_name, jersey_color)")
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
        .select("id, innings_id, ball_index, over_number, ball_in_over, runs, extra_type, is_wicket, wicket_type, batter_id, non_striker_id, bowler_id, dismissed_player_id")
        .in("innings_id", innList.map((i) => i.id)).order("ball_index");
      setBalls((bs as Ball[]) ?? []);
    }

    const { data: ms } = await supabase.from("team_members")
      .select("id, player_name, team_id, jersey_number, role, batting_style, bowling_style, profiles(avatar_url)")
      .in("team_id", [mm.team_a.id, mm.team_b.id]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memList: Member[] = ((ms ?? []) as any[]).map((p) => ({
      id: p.id, player_name: p.player_name, team_id: p.team_id,
      jersey_number: p.jersey_number, role: p.role ?? null,
      batting_style: p.batting_style ?? null, bowling_style: p.bowling_style ?? null,
      avatar_url: p.profiles?.avatar_url ?? null,
    }));
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
    <div className="min-h-screen" style={{ background: "#f5f5f5" }}>
      <Navbar />

      {/* ── Cricbuzz-exact match header ── */}
      <div style={{ background: CB.green }}>
        <div className="mx-auto max-w-4xl px-4 pt-3 pb-0 sm:px-6">

          {/* Series / format bar */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-white/70 font-medium">
              {match.overs} Overs Match{match.venue ? ` · ${match.venue}` : ""}
            </span>
            <div className="flex items-center gap-2">
              {match.status === "live" && (
                <span className="flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
                </span>
              )}
              {match.status === "completed" && (
                <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Final
                </span>
              )}
            </div>
          </div>

          {/* Team score rows — exact Cricbuzz layout */}
          <div className="rounded-t-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.15)" }}>
            {[match.team_a, match.team_b].map((team, ti) => {
              const inn = innings.find((i) => i.batting_team_id === team.id);
              const isBatting = currentInn?.batting_team_id === team.id && match.status === "live";
              const overs = inn ? `${Math.floor(inn.balls / 6)}.${inn.balls % 6}` : "";
              const rr = inn && inn.balls > 0 ? ((inn.runs / inn.balls) * 6).toFixed(2) : null;
              return (
                <div key={team.id}
                  className={`flex items-center gap-3 px-4 py-3 ${ti === 0 ? "border-b border-white/10" : ""} ${isBatting ? "bg-white/10" : ""}`}>
                  {/* Team badge */}
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-xs font-bold text-white border border-white/30"
                    style={{ background: team.jersey_color || CB.greenDark }}>
                    {(team.short_name || team.name).slice(0, 3).toUpperCase()}
                  </span>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-base truncate ${isBatting ? "text-white" : "text-white/80"}`}>
                      {team.short_name || team.name}
                    </div>
                    {isBatting && rr && (
                      <div className="text-[10px] text-white/60">CRR: {rr}</div>
                    )}
                  </div>
                  {/* Score */}
                  <div className="text-right shrink-0">
                    {inn ? (
                      <>
                        <div className={`font-display tabular-nums ${isBatting ? "text-2xl text-white" : "text-xl text-white/80"}`}>
                          {inn.runs}<span className="text-white/60 font-normal">-{inn.wickets}</span>
                        </div>
                        <div className="text-[10px] text-white/50 font-mono">({overs} Ov)</div>
                      </>
                    ) : (
                      <span className="text-sm text-white/40 italic">Yet to bat</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chase / result bar */}
          {(match.result_text || (match.status === "live" && currentInn?.target)) && (
            <div className="mt-0 px-4 py-2 text-xs font-semibold" style={{ background: "rgba(0,0,0,0.2)", color: CB.orange }}>
              {match.result_text || (currentInn?.target ? `Need ${Math.max(0, currentInn.target - currentInn.runs)} runs in ${Math.max(0, match.overs * 6 - currentInn.balls)} balls · RRR ${currentInn.balls < match.overs * 6 ? (((currentInn.target - currentInn.runs) / (match.overs * 6 - currentInn.balls)) * 6).toFixed(2) : "—"}` : "")}
            </div>
          )}

          {/* Tabs — Cricbuzz style */}
          <div className="flex gap-0 overflow-x-auto mt-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="relative shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-widest transition"
                style={{ color: tab === t.id ? "#fff" : "rgba(255,255,255,0.45)" }}>
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 inset-x-0 h-[3px]" style={{ background: CB.orange }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <main className="mx-auto max-w-4xl px-4 py-4 sm:px-6" style={{ background: "#f5f5f5" }}>
        {tab === "info" && <InfoTab match={match} innings={innings} />}
        {tab === "live" && <LiveTab match={match} innings={innings} currentInn={currentInn} balls={balls} players={players} />}
        {tab === "scorecard" && <ScorecardTab match={match} innings={innings} balls={balls} players={players} />}
        {tab === "commentary" && <CommentaryTab innings={innings} balls={balls} players={players} match={match} />}
        {tab === "summary" && <SummaryTab match={match} innings={innings} balls={balls} players={players} motmMember={motmMember} motmProfile={motmProfile} myMemberId={myMemberId} myInsight={myInsight} loadingInsight={loadingInsight} setMyInsight={setMyInsight} setLoadingInsight={setLoadingInsight} matchId={matchId} />}
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
      {/* Live video with CricHeroes/Hotstar-style scorecard overlay */}
      {match.stream_status === "live" && match.stream_url && (
        <VideoStreamEmbed
          matchId={match.id}
          initialStreamUrl={match.stream_url}
          initialStatus={match.stream_status}
          overlay={
            <LiveBroadcastOverlay match={match} innings={currentInn} balls={balls} players={players} />
          }
        />
      )}

      {/* At the crease — Cricbuzz green header card */}
      <CbCard>
        <CbCardHeader label={`Innings ${currentInn.innings_no} · At the crease`} />
        <div className="grid grid-cols-3 divide-x divide-border">
          <CbPlayerCell label="Striker ✦" id={currentInn.striker_id} name={currentInn.striker_id ? players[currentInn.striker_id]?.player_name : null} accent />
          <CbPlayerCell label="Non-striker" id={currentInn.non_striker_id} name={currentInn.non_striker_id ? players[currentInn.non_striker_id]?.player_name : null} />
          <CbPlayerCell label="Bowler" id={currentInn.bowler_id} name={currentInn.bowler_id ? players[currentInn.bowler_id]?.player_name : null} />
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
type FowEntry = { wicket: number; score: number; over: string; batsmanName: string; batsmanId: string | null };
type Partnership = { bat1: string; bat1Id: string | null; bat2: string; bat2Id: string | null; runs: number; balls: number };
type BowlLine = { id: string; name: string; legal: number; runs: number; wkts: number; maidens: number; nb: number; wd: number };

function buildInningsTables(innBalls: Ball[], players: Record<string, Member>, matchOvers: number) {
  const batMap = new Map<string, BatLine>();
  const order: string[] = [];
  const ensureBat = (id: string) => {
    if (!batMap.has(id)) {
      batMap.set(id, { id, name: players[id]?.player_name ?? "—", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, outDesc: "not out" });
      order.push(id);
    }
    return batMap.get(id)!;
  };

  // Track running score for FOW
  let runningRuns = 0;
  let runningLegalBalls = 0;
  const fow: FowEntry[] = [];
  const partnerships: Partnership[] = [];
  let partnershipStart = 0;
  let partnershipBalls = 0;
  let currentStriker: string | null = null;
  let currentNonStriker: string | null = null;

  innBalls.forEach((b) => {
    // Track batters in order
    if (b.batter_id && !order.includes(b.batter_id)) {
      ensureBat(b.batter_id);
    }
    if (b.non_striker_id && !order.includes(b.non_striker_id)) {
      ensureBat(b.non_striker_id);
    }

    // Running score
    const isLegal = b.extra_type !== "wide" && b.extra_type !== "noball";
    if (isLegal) { runningLegalBalls++; partnershipBalls++; }
    runningRuns += b.runs;
    if (b.extra_type === "wide" || b.extra_type === "noball") runningRuns += 1;

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
      const wt = b.wicket_type ?? "";
      if (wt === "runout") row.outDesc = "run out";
      else if (wt === "caught" || wt === "caught_behind") row.outDesc = bowlerName ? `c & b ${bowlerName}` : "caught";
      else if (wt === "bowled") row.outDesc = bowlerName ? `b ${bowlerName}` : "bowled";
      else if (wt === "lbw") row.outDesc = bowlerName ? `lbw b ${bowlerName}` : "lbw";
      else if (wt === "stumped") row.outDesc = bowlerName ? `st b ${bowlerName}` : "stumped";
      else if (wt === "hit_wicket") row.outDesc = bowlerName ? `hit wicket b ${bowlerName}` : "hit wicket";
      else if (wt === "retired_hurt") row.outDesc = "retired hurt";
      else row.outDesc = bowlerName ? `b ${bowlerName}` : "out";

      // FOW
      const overStr = `${Math.floor(runningLegalBalls / 6)}.${runningLegalBalls % 6}`;
      fow.push({ wicket: fow.length + 1, score: runningRuns, over: overStr, batsmanName: row.name, batsmanId: row.id });

      // Partnership
      const partRuns = runningRuns - partnershipStart;
      if (currentStriker && currentNonStriker) {
        partnerships.push({
          bat1: players[currentStriker]?.player_name ?? "—", bat1Id: currentStriker,
          bat2: players[currentNonStriker]?.player_name ?? "—", bat2Id: currentNonStriker,
          runs: partRuns, balls: partnershipBalls,
        });
      }
      partnershipStart = runningRuns;
      partnershipBalls = 0;
    }

    // Update current batters
    if (b.batter_id) currentStriker = b.batter_id;
    if (b.non_striker_id) currentNonStriker = b.non_striker_id;
  });

  const bowlMap = new Map<string, BowlLine>();
  const perOver = new Map<string, Map<number, { runs: number; legal: number }>>();
  innBalls.forEach((b) => {
    if (!b.bowler_id) return;
    const row = bowlMap.get(b.bowler_id) ?? { id: b.bowler_id, name: players[b.bowler_id]?.player_name ?? "—", legal: 0, runs: 0, wkts: 0, maidens: 0, nb: 0, wd: 0 };
    row.runs += b.runs;
    if (b.extra_type === "wide" || b.extra_type === "noball") row.runs += 1;
    if (b.extra_type !== "wide" && b.extra_type !== "noball") row.legal++;
    if (b.extra_type === "noball") row.nb++;
    if (b.extra_type === "wide") row.wd++;
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

  // Extras breakdown
  const extras = { byes: 0, legbyes: 0, wides: 0, noballs: 0 };
  innBalls.forEach((b) => {
    if (b.extra_type === "bye") extras.byes += b.runs;
    else if (b.extra_type === "legbye") extras.legbyes += b.runs;
    else if (b.extra_type === "wide") extras.wides += b.runs + 1;
    else if (b.extra_type === "noball") extras.noballs += 1;
  });

  // Powerplay (first 6 overs, or fewer for short-format matches)
  const ppOvers = Math.min(6, matchOvers);
  let ppRuns = 0;
  innBalls.forEach((b) => {
    if (b.over_number < ppOvers) ppRuns += b.runs + (b.extra_type === "wide" || b.extra_type === "noball" ? 1 : 0);
  });

  return { batting: order.map((id) => batMap.get(id)!), bowling: [...bowlMap.values()], fow, partnerships, extras, ppOvers, ppRuns };
}

function ScorecardTab({ match, innings, balls, players }: { match: Match; innings: Innings[]; balls: Ball[]; players: Record<string, Member> }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!innings.length || !balls.length) return <EmptyState msg="Scorecard appears once the match starts." />;

  const orderedInnings = [...innings].sort((a, b) => b.innings_no - a.innings_no); // most recent first
  const activeId = selected && innings.some((i) => i.id === selected) ? selected : orderedInnings[0]?.id;

  return (
    <div className="space-y-4">
      {/* Innings toggle pills — only shown once there's more than one innings */}
      {orderedInnings.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {orderedInnings.map((inn) => {
            const t = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
            const isActive = inn.id === activeId;
            return (
              <button
                key={inn.id}
                onClick={() => setSelected(inn.id)}
                className="rounded-full px-4 py-1.5 text-sm font-semibold transition"
                style={isActive
                  ? { background: CB.green, color: "#fff" }
                  : { background: CB.tableHeader, color: CB.muted }}
              >
                {t.short_name || t.name} ({inn.innings_no === 1 ? "1st" : "2nd"} Inn)
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-5">
        {orderedInnings.filter((inn) => inn.id === activeId).map((inn) => {
        const battingTeam = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
        const innBalls = balls.filter((b) => b.innings_id === inn.id);
        const { batting, bowling, fow, partnerships, extras, ppOvers, ppRuns } = buildInningsTables(innBalls, players, match.overs);
        const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
        const rr = inn.balls > 0 ? ((inn.runs / inn.balls) * 6).toFixed(2) : "0.00";
        return (
          <div key={inn.id} className="space-y-4">
          <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
            {/* Innings header */}
            <div className="flex items-center justify-between px-4 py-2 font-bold text-white" style={{ background: CB.green }}>
              <span>{battingTeam.name}</span>
              <span>{inn.runs}-{inn.wickets} <span className="font-normal opacity-90">({overs} Ov)</span></span>
            </div>

            {/* Batting table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                  <tr>
                    <th className="px-4 py-2 w-1/3">Batter</th>
                    <th className="px-2 py-2 text-right">R</th>
                    <th className="px-2 py-2 text-right">B</th>
                    <th className="px-2 py-2 text-right">4s</th>
                    <th className="px-2 py-2 text-right">6s</th>
                    <th className="px-2 py-2 text-right">SR</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batting.length === 0 ? (
                    <tr><td colSpan={7} className="py-5 text-center text-xs text-gray-500">No batting yet</td></tr>
                  ) : batting.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <PlayerLink id={r.id} name={r.name} />
                        <span className="block text-xs text-gray-500">{r.out ? r.outDesc : "batting"}</span>
                      </td>
                      <td className="px-2 py-3 text-right font-bold">{r.runs}</td>
                      <td className="px-2 py-3 text-right">{r.balls}</td>
                      <td className="px-2 py-3 text-right">{r.fours}</td>
                      <td className="px-2 py-3 text-right">{r.sixes}</td>
                      <td className="px-2 py-3 text-right">{r.balls > 0 ? ((r.runs / r.balls) * 100).toFixed(2) : "0.00"}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{r.id ? "›" : ""}</td>
                    </tr>
                  ))}

                  {/* Extras */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-4 py-2">Extras</td>
                    <td className="px-2 py-2 text-right" colSpan={5}>
                      {inn.extras} <span className="font-normal text-xs text-gray-500">(b {extras.byes}, lb {extras.legbyes}, w {extras.wides}, nb {extras.noballs})</span>
                    </td>
                    <td></td>
                  </tr>
                  {/* Total */}
                  <tr className="bg-white border-t border-gray-200 font-bold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-2 py-2 text-right" colSpan={5}>
                      {inn.runs}-{inn.wickets} <span className="font-normal text-xs text-gray-500">({overs} Overs, RR: {rr})</span>
                    </td>
                    <td></td>
                  </tr>
                  {/* Yet to bat */}
                  {(() => {
                    const battedIds = new Set(batting.map(b => b.id));
                    const allSquad = Object.values(players).filter(p => p.team_id === battingTeam.id);
                    const yetToBat = allSquad.filter(p => !battedIds.has(p.id));
                    if (!yetToBat.length) return null;
                    return (
                      <tr className="bg-white border-t border-gray-200 text-xs">
                        <td className="px-4 py-3 font-bold">Yet to Bat</td>
                        <td className="px-2 py-3" colSpan={6}>
                          {yetToBat.map((p, i) => (
                            <span key={p.id}>
                              <PlayerLink id={p.id} name={p.player_name} className="text-[#0284c7] hover:underline" />
                              {i < yetToBat.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

            {/* Bowling table — its own card */}
            <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                  <tr>
                    <th className="px-4 py-2 w-1/3">Bowler</th>
                    <th className="px-2 py-2 text-right">O</th>
                    <th className="px-2 py-2 text-right">M</th>
                    <th className="px-2 py-2 text-right">R</th>
                    <th className="px-2 py-2 text-right font-black">W</th>
                    <th className="px-2 py-2 text-right">NB</th>
                    <th className="px-2 py-2 text-right">WD</th>
                    <th className="px-2 py-2 text-right">ECO</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bowling.length === 0 ? (
                    <tr><td colSpan={9} className="py-5 text-center text-xs text-gray-500">No bowling yet</td></tr>
                  ) : bowling.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><PlayerLink id={r.id} name={r.name} /></td>
                      <td className="px-2 py-3 text-right font-medium">{Math.floor(r.legal / 6)}.{r.legal % 6}</td>
                      <td className="px-2 py-3 text-right">{r.maidens}</td>
                      <td className="px-2 py-3 text-right">{r.runs}</td>
                      <td className="px-2 py-3 text-right font-bold">{r.wkts}</td>
                      <td className="px-2 py-3 text-right">{r.nb}</td>
                      <td className="px-2 py-3 text-right">{r.wd}</td>
                      <td className="px-2 py-3 text-right">{r.legal > 0 ? ((r.runs / r.legal) * 6).toFixed(2) : "0.00"}</td>
                      <td className="px-4 py-3 text-right text-gray-400">›</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>

            {/* Fall of Wickets — its own card */}
            {fow.length > 0 && (
              <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                <div className="bg-gray-100 px-4 py-2 font-bold text-sm">Fall of Wickets</div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-500 font-semibold border-b">
                    <tr>
                      <th className="px-4 py-2">Batter</th>
                      <th className="px-4 py-2 text-center">Score</th>
                      <th className="px-4 py-2 text-right">Over</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fow.map((f) => (
                      <tr key={f.wicket}>
                        <td className="px-4 py-2"><PlayerLink id={f.batsmanId} name={f.batsmanName} className="text-[#0284c7]" /></td>
                        <td className="px-4 py-2 text-center">{f.score}-{f.wicket}</td>
                        <td className="px-4 py-2 text-right">{f.over}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Powerplays — its own card */}
            {ppOvers > 0 && innBalls.length > 0 && (
              <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                <div className="bg-gray-100 px-4 py-2 font-bold text-sm">Powerplays</div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-gray-500 font-semibold border-b">
                    <tr>
                      <th className="px-4 py-2">Mandatory</th>
                      <th className="px-4 py-2 text-center">Overs</th>
                      <th className="px-4 py-2 text-right">Runs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2">Mandatory</td>
                      <td className="px-4 py-2 text-center">0.1 - {ppOvers}</td>
                      <td className="px-4 py-2 text-right">{ppRuns}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Partnerships — its own card */}
            {partnerships.length > 0 && (
              <div className="overflow-hidden rounded border border-gray-200 bg-white shadow-sm">
                <div className="bg-gray-100 px-4 py-2 font-bold text-sm">Partnerships</div>
                <div className="p-4 space-y-2">
                  {partnerships.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-semibold w-16 shrink-0 tabular-nums">{p.runs}({p.balls})</span>
                      <div className="flex-1 min-w-0">
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.runs)}%`, background: CB.green }} />
                        </div>
                      </div>
                      <span className="text-gray-500 shrink-0 text-[11px]">
                        <PlayerLink id={p.bat1Id} name={p.bat1} className="text-[#0284c7]" /> & <PlayerLink id={p.bat2Id} name={p.bat2} className="text-[#0284c7]" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}

/* ─── Commentary ─── */
function CommentaryLine({ b, players }: { b: Ball; players: Record<string, Member> }) {
  const batterName = b.batter_id ? players[b.batter_id]?.player_name ?? "batter" : "batter";
  const bowlerName = b.bowler_id ? players[b.bowler_id]?.player_name ?? "bowler" : "bowler";
  const Batter = <PlayerLink id={b.batter_id} name={batterName} />;
  const Bowler = <PlayerLink id={b.bowler_id} name={bowlerName} />;

  if (b.is_wicket) {
    const dismissedId = b.dismissed_player_id ?? b.batter_id;
    const dismissedName = b.dismissed_player_id ? players[b.dismissed_player_id]?.player_name ?? batterName : batterName;
    return <>OUT! {Bowler} to <PlayerLink id={dismissedId} name={dismissedName} /> — {b.wicket_type ?? "wicket"}.</>;
  }
  if (b.extra_type === "wide") return <>{Bowler} to {Batter}, wide. {b.runs} run{b.runs === 1 ? "" : "s"}.</>;
  if (b.extra_type === "noball") return <>{Bowler} to {Batter}, NO BALL. {b.runs} run{b.runs === 1 ? "" : "s"}.</>;
  if (b.extra_type === "bye") return <>{Bowler} to {Batter}, {b.runs} bye{b.runs === 1 ? "" : "s"}.</>;
  if (b.extra_type === "legbye") return <>{Bowler} to {Batter}, {b.runs} leg-bye{b.runs === 1 ? "" : "s"}.</>;
  if (b.runs === 6) return <>SIX! {Bowler} to {Batter}, launched into the stands!</>;
  if (b.runs === 4) return <>FOUR! {Bowler} to {Batter}, finds the boundary!</>;
  if (b.runs === 0) return <>{Bowler} to {Batter}, dot ball.</>;
  return <>{Bowler} to {Batter}, {b.runs} run{b.runs === 1 ? "" : "s"}.</>;
}

/* ─── Over-by-over timeline: powers the over-summary card + spell/arrival captions ─── */
type OverEntry = {
  overNumber: number; balls: Ball[]; isComplete: boolean;
  runsInOver: number; wicketsInOver: number; cumRuns: number; cumWkts: number;
  bowler: { id: string; name: string } | null;
  bowlerFigures: { overs: string; runs: number; wkts: number };
  batters: { id: string; name: string; runs: number; balls: number }[];
};

function buildOverTimeline(ascBalls: Ball[], players: Record<string, Member>) {
  const overs: OverEntry[] = [];
  const batRun = new Map<string, { runs: number; balls: number }>();
  const bowlRun = new Map<string, { runs: number; legal: number; wkts: number }>();
  const firstBowlerBall = new Map<string, string>();
  const firstBatterBall = new Map<string, string>();
  let cumRuns = 0, cumWkts = 0;

  ascBalls.forEach((b) => {
    if (b.bowler_id && !firstBowlerBall.has(b.bowler_id)) firstBowlerBall.set(b.bowler_id, b.id);
    if (b.batter_id && !firstBatterBall.has(b.batter_id)) firstBatterBall.set(b.batter_id, b.id);

    const ballRuns = b.runs + (b.extra_type === "wide" || b.extra_type === "noball" ? 1 : 0);
    cumRuns += ballRuns;
    if (b.is_wicket) cumWkts += 1;

    if (b.batter_id) {
      const row = batRun.get(b.batter_id) ?? { runs: 0, balls: 0 };
      if (b.extra_type !== "wide") row.balls += 1;
      const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
      if (isBatRun) row.runs += b.extra_type === "noball" ? b.runs - 1 : b.runs;
      batRun.set(b.batter_id, row);
    }
    if (b.bowler_id) {
      const row = bowlRun.get(b.bowler_id) ?? { runs: 0, legal: 0, wkts: 0 };
      row.runs += ballRuns;
      if (b.extra_type !== "wide" && b.extra_type !== "noball") row.legal += 1;
      if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") row.wkts += 1;
      bowlRun.set(b.bowler_id, row);
    }

    let g = overs[overs.length - 1];
    if (!g || g.overNumber !== b.over_number) {
      g = { overNumber: b.over_number, balls: [], isComplete: false, runsInOver: 0, wicketsInOver: 0, cumRuns: 0, cumWkts: 0, bowler: null, bowlerFigures: { overs: "0.0", runs: 0, wkts: 0 }, batters: [] };
      overs.push(g);
    }
    g.balls.push(b);
    g.runsInOver += ballRuns;
    if (b.is_wicket) g.wicketsInOver += 1;
    g.cumRuns = cumRuns;
    g.cumWkts = cumWkts;
    if (b.bowler_id) {
      const fig = bowlRun.get(b.bowler_id)!;
      g.bowler = { id: b.bowler_id, name: players[b.bowler_id]?.player_name ?? "—" };
      g.bowlerFigures = { overs: `${Math.floor(fig.legal / 6)}.${fig.legal % 6}`, runs: fig.runs, wkts: fig.wkts };
    }
    const crease = [b.batter_id, b.non_striker_id].filter(Boolean) as string[];
    g.batters = crease.map((id) => ({ id, name: players[id]?.player_name ?? "—", runs: batRun.get(id)?.runs ?? 0, balls: batRun.get(id)?.balls ?? 0 }));
  });

  overs.forEach((g) => {
    const legal = g.balls.filter((b) => b.extra_type !== "wide" && b.extra_type !== "noball").length;
    g.isComplete = legal >= 6;
  });

  return { overs, firstBowlerBall, firstBatterBall };
}

function OverSummaryCard({ over }: { over: OverEntry }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm">Over {over.overNumber + 1}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{over.cumRuns}-{over.cumWkts}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {over.balls.map((b) => <BallPill key={b.id} b={b} />)}
          <span className="ml-1 text-[11px] text-muted-foreground">({over.runsInOver} run{over.runsInOver === 1 ? "" : "s"})</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-x-4">
          {over.batters.map((bat) => (
            <span key={bat.id}><PlayerLink id={bat.id} name={bat.name} className="font-medium text-[#0284c7]" /> {bat.runs} ({bat.balls})</span>
          ))}
        </div>
        {over.bowler && (
          <span>
            <PlayerLink id={over.bowler.id} name={over.bowler.name} className="font-medium text-[#0284c7]" />{" "}
            {over.bowlerFigures.overs}-0-{over.bowlerFigures.runs}-{over.bowlerFigures.wkts}
          </span>
        )}
      </div>
    </div>
  );
}

function InningsAnalysisCard({ inn, team, batting, bowling, opponentTarget }: {
  inn: Innings; team: Team;
  batting: BatLine[]; bowling: BowlLine[]; opponentTarget: number | null;
}) {
  if (!batting.length) return null;
  const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
  const rr = inn.balls > 0 ? ((inn.runs / inn.balls) * 6).toFixed(2) : "0.00";
  const topBat = [...batting].sort((a, b) => b.runs - a.runs)[0];
  const topBowl = bowling.length ? [...bowling].sort((a, b) => b.wkts - a.wkts || a.runs - b.runs)[0] : null;

  let chaseLine: string | null = null;
  if (opponentTarget != null) {
    if (inn.runs >= opponentTarget) {
      chaseLine = `Chasing ${opponentTarget}, ${team.name} got over the line with ${10 - inn.wickets} wicket${10 - inn.wickets === 1 ? "" : "s"} in hand — a well-controlled run chase.`;
    } else {
      const short = opponentTarget - inn.runs;
      chaseLine = inn.wickets >= 10
        ? `Chasing ${opponentTarget}, ${team.name} were bowled out ${short} run${short === 1 ? "" : "s"} short of the target.`
        : `Chasing ${opponentTarget}, ${team.name} finished on ${inn.runs}-${inn.wickets}, falling ${short} run${short === 1 ? "" : "s"} short.`;
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>
        Innings Analysis · {team.name}
      </div>
      <div className="px-4 py-3 bg-card text-sm leading-relaxed text-foreground space-y-1.5">
        <p>
          {team.name} finished on <b>{inn.runs}-{inn.wickets}</b> from {overs} overs (RR {rr}).{" "}
          {topBat && (
            <><PlayerLink id={topBat.id} name={topBat.name} className="font-semibold text-[#0284c7]" /> top-scored with {topBat.runs} off {topBat.balls} balls
            {topBat.fours + topBat.sixes > 0 ? ` (${topBat.fours}x4, ${topBat.sixes}x6)` : ""}.</>
          )}
        </p>
        {topBowl && topBowl.wkts > 0 && (
          <p>
            With the ball, <PlayerLink id={topBowl.id} name={topBowl.name} className="font-semibold text-[#0284c7]" /> was the standout, picking up {topBowl.wkts} wicket{topBowl.wkts === 1 ? "" : "s"} for {topBowl.runs} runs.
          </p>
        )}
        {chaseLine && <p>{chaseLine}</p>}
      </div>
    </div>
  );
}

function CommentaryTab({ innings, balls, players, match }: { innings: Innings[]; balls: Ball[]; players: Record<string, Member>; match: Match }) {
  if (!balls.length) return <EmptyState msg="Commentary appears ball-by-ball." />;
  return (
    <div className="space-y-5">
      {[...innings].reverse().map((inn) => {
        const team = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
        const ascBalls = balls.filter((b) => b.innings_id === inn.id);
        if (!ascBalls.length) return null;
        const { overs, firstBowlerBall, firstBatterBall } = buildOverTimeline(ascBalls, players);
        const { batting, bowling } = buildInningsTables(ascBalls, players, match.overs);
        const isInningsOver = inn.wickets >= 10 || inn.balls >= match.overs * 6
          || innings.some((x) => x.innings_no > inn.innings_no) || match.status === "completed";
        const oversDesc = [...overs].reverse();

        return (
          <section key={inn.id} className="space-y-3">
            <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{team.name} · Innings {inn.innings_no}</div>

            {isInningsOver && (
              <InningsAnalysisCard inn={inn} team={team} batting={batting} bowling={bowling} opponentTarget={inn.target} />
            )}

            {oversDesc.map((over) => (
              <div key={over.overNumber} className="space-y-2">
                {over.isComplete && <OverSummaryCard over={over} />}
                <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                  {[...over.balls].reverse().map((b) => {
                    const bowlerIntro = b.bowler_id && firstBowlerBall.get(b.bowler_id) === b.id ? players[b.bowler_id] : null;
                    const batterIntro = b.batter_id && firstBatterBall.get(b.batter_id) === b.id ? players[b.batter_id] : null;
                    return (
                      <div key={b.id} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground pt-0.5">{b.over_number}.{b.ball_in_over}</span>
                          <BallPill b={b} />
                          <p className={`text-sm flex-1 ${b.is_wicket ? "font-semibold text-destructive" : b.runs >= 6 ? "font-semibold" : "text-foreground"}`}
                            style={b.runs >= 6 && !b.is_wicket ? { color: CB.orangeText } : {}}>
                            <CommentaryLine b={b} players={players} />
                          </p>
                        </div>
                        {bowlerIntro && (
                          <p className="mt-1.5 pl-[3.25rem] text-xs font-semibold text-foreground">
                            <PlayerLink id={bowlerIntro.id} name={bowlerIntro.player_name} />
                            {bowlerIntro.bowling_style ? `, ${bowlerIntro.bowling_style}` : ""}, comes into the attack
                          </p>
                        )}
                        {batterIntro && (
                          <p className="mt-1.5 pl-[3.25rem] text-xs font-semibold text-foreground">
                            <PlayerLink id={batterIntro.id} name={batterIntro.player_name} />
                            {batterIntro.batting_style ? `, ${batterIntro.batting_style}` : ""}, comes to the crease
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/* ─── Summary + MOTM ─── */
function SummaryTab({ match, innings, balls, players, motmMember, motmProfile, myMemberId, myInsight, loadingInsight, setMyInsight, setLoadingInsight, matchId }: {
  match: Match; innings: Innings[]; balls: Ball[]; players: Record<string, Member>;
  motmMember: Member | null; motmProfile: MotmProfile | null;
  myMemberId: string | null; myInsight: string | null; loadingInsight: boolean;
  setMyInsight: (v: string) => void; setLoadingInsight: (v: boolean) => void;
  matchId: string;
}) {
  // Build this player's contribution for the AI prompt
  const myContrib = (() => {
    if (!myMemberId) return null;
    const myBalls = balls.filter((b) => b.batter_id === myMemberId || b.bowler_id === myMemberId || b.dismissed_player_id === myMemberId);
    if (!myBalls.length) return null;
    let bRuns = 0, bBalls = 0, bFours = 0, bSixes = 0, batOut = false;
    myBalls.filter((b) => b.batter_id === myMemberId).forEach((b) => {
      if (b.extra_type !== "wide") bBalls++;
      const isBat = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
      if (isBat) { const r = b.extra_type === "noball" ? b.runs - 1 : b.runs; bRuns += r; if (r === 4) bFours++; if (r === 6) bSixes++; }
    });
    if (myBalls.some((b) => b.dismissed_player_id === myMemberId && b.is_wicket)) batOut = true;
    let bowlRuns = 0, bowlLegal = 0, bowlWkts = 0;
    myBalls.filter((b) => b.bowler_id === myMemberId).forEach((b) => {
      bowlRuns += b.runs;
      if (b.extra_type !== "wide" && b.extra_type !== "noball") bowlLegal++;
      if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") bowlWkts++;
    });
    let catches = 0, runouts = 0;
    myBalls.forEach((b) => {
      if (!b.is_wicket) return;
      if ((b.wicket_type === "caught" || b.wicket_type === "caught_behind") && b.bowler_id === myMemberId) catches++;
      if (b.wicket_type === "runout" && b.dismissed_player_id === myMemberId) runouts++;
    });
    return { bRuns, bBalls, bFours, bSixes, batOut, bowlLegal, bowlRuns, bowlWkts, catches, runouts };
  })();

  const generateInsight = async () => {
    if (!myContrib || loadingInsight || myInsight) return;
    setLoadingInsight(true);
    const c = myContrib;
    const prompt = `You are an enthusiastic cricket coach giving personal post-match feedback. Write a SHORT (2-3 sentences, max 70 words), MOTIVATING and SPECIFIC message for this player based on their match contribution.

Their stats:
${c.bBalls > 0 ? `Batting: ${c.bRuns} runs off ${c.bBalls} balls (${c.bFours} fours, ${c.bSixes} sixes). ${c.batOut ? "Got out." : "Remained not out."}` : "Did not bat."}
${c.bowlLegal > 0 ? `Bowling: ${Math.floor(c.bowlLegal/6)}.${c.bowlLegal%6} overs, ${c.bowlRuns} runs, ${c.bowlWkts} wickets.` : "Did not bowl."}
${c.catches + c.runouts > 0 ? `Fielding: ${c.catches} catch(es), ${c.runouts} run out(s).` : ""}
Match result: ${match.result_text ?? "Unknown"}

Rules:
- Write in second person (You...)
- Be specific about their numbers, not generic
- Find something genuinely positive even in modest stats
- End with one forward-looking motivational line
- Never use clichés like "great effort" alone`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      setMyInsight(data.content?.[0]?.text ?? "You played your part today — keep building on it!");
    } catch {
      setMyInsight("You gave it your all out there. Every match adds to your game — keep going!");
    }
    setLoadingInsight(false);
  };
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
      {/* Personal motivational insight — only shown to logged-in player */}
      {myMemberId && myContrib && match.status === "completed" && (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-bold">
              <Zap className="h-3.5 w-3.5" /> Your Performance
            </div>
            {!myInsight && !loadingInsight && (
              <button onClick={generateInsight}
                className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition hover:brightness-110 active:scale-95">
                Get Analysis
              </button>
            )}
          </div>

          {/* Quick stat chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {myContrib.bBalls > 0 && (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">
                🏏 {myContrib.bRuns} runs ({myContrib.bBalls}b)
                {myContrib.bSixes > 0 && ` · ${myContrib.bSixes}×6`}
                {myContrib.bFours > 0 && ` · ${myContrib.bFours}×4`}
              </span>
            )}
            {myContrib.bowlLegal > 0 && (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">
                🎳 {myContrib.bowlWkts}W/{myContrib.bowlRuns}R ({Math.floor(myContrib.bowlLegal/6)}.{myContrib.bowlLegal%6} ov)
              </span>
            )}
            {myContrib.catches > 0 && (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">
                🙌 {myContrib.catches} catch{myContrib.catches > 1 ? "es" : ""}
              </span>
            )}
            {myContrib.runouts > 0 && (
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">
                🏃 {myContrib.runouts} run out{myContrib.runouts > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* AI insight */}
          {loadingInsight && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Analysing your match...</span>
            </div>
          )}
          {myInsight && (
            <div className="mt-1 rounded-lg bg-card border border-border p-3.5">
              <p className="text-sm text-foreground leading-relaxed">{myInsight}</p>
            </div>
          )}
          {!myInsight && !loadingInsight && (
            <p className="text-xs text-muted-foreground">Tap "Get Analysis" for your personal post-match coaching insight.</p>
          )}
        </div>
      )}

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
              <div className="font-display text-xl">
                <PlayerLink id={motmMember.id} name={motmProfile?.full_name ?? motmMember.player_name} />
              </div>
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
                <span className="flex-1 text-sm font-medium"><PlayerLink id={r.id} name={r.name} /></span>
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
                <span className="flex-1 text-sm font-medium"><PlayerLink id={r.id} name={r.name} /></span>
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
          <div className="space-y-2 bg-background p-3">
            {players.length === 0 ? (
              <p className="px-2 py-5 text-center text-xs text-muted-foreground">No players.</p>
            ) : players.map((p) => (
              <Link
                key={p.id}
                to="/players/$playerId"
                params={{ playerId: p.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary/30 hover:shadow-md"
              >
                <PlayerAvatarChip name={p.player_name} avatarUrl={p.avatar_url ?? null} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{p.player_name}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <RoleBadge role={p.role ?? null} />
                    {p.is_captain && (
                      <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">C</span>
                    )}
                    {p.is_wicketkeeper && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">WK</span>
                    )}
                  </div>
                </div>
                <FollowButton entityType="player" entityId={p.id} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


/* ─── Info Tab ─── */
function InfoTab({ match, innings }: { match: Match; innings: Innings[] }) {
  const fmtDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };
  const fmtTime = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Match", value: `${match.team_a.name} vs ${match.team_b.name}` },
    { label: "Format", value: `T${match.overs}` },
    { label: "Date", value: fmtDate(match.created_at) },
    { label: "Time", value: fmtTime(match.created_at) },
    { label: "Venue", value: match.venue || "—" },
    { label: "Status", value: match.status === "completed" ? "Completed" : match.status === "live" ? "In Progress" : "Scheduled" },
    ...(match.result_text ? [{ label: "Result", value: match.result_text }] : []),
    ...(match.completed_at ? [{ label: "Completed", value: fmtDate(match.completed_at) }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Match Info card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>
          Match Info
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-4 px-4 py-3">
              <span className="w-28 shrink-0 text-xs font-semibold text-muted-foreground">{r.label}</span>
              <span className="flex-1 text-sm text-foreground">{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Innings summary */}
      {innings.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white" style={{ background: CB.green }}>
            Innings Summary
          </div>
          <div className="divide-y divide-border">
            {innings.map((inn) => {
              const team = inn.batting_team_id === match.team_a.id ? match.team_a : match.team_b;
              const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
              const rr = inn.balls > 0 ? ((inn.runs / inn.balls) * 6).toFixed(2) : "0.00";
              return (
                <div key={inn.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-md font-display text-[10px] font-bold text-white"
                        style={{ backgroundColor: team.jersey_color || CB.green }}>
                        {(team.short_name || team.name).slice(0, 3).toUpperCase()}
                      </span>
                      <span className="font-semibold text-sm">{team.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl tabular-nums">{inn.runs}-{inn.wickets}</div>
                      <div className="text-[10px] text-muted-foreground">{overs} Ov · RR {rr}</div>
                    </div>
                  </div>
                  {inn.target && (
                    <div className="mt-1.5 text-xs text-primary">Target: {inn.target}</div>
                  )}
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    Extras: {inn.extras}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
function CbPlayerCell({ label, name, id, accent }: { label: string; name?: string | null; id?: string | null; accent?: boolean }) {
  return (
    <div className={`px-3 py-3 ${accent ? "bg-primary/5" : ""}`}>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 truncate font-semibold text-sm ${accent ? "" : "text-foreground"}`}
        style={accent ? { color: CB.orangeText } : {}}>
        <PlayerLink id={id} name={name} />
      </div>
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