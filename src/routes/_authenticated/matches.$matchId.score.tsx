import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Eye, Undo2, RefreshCw, Flag, Star, ChevronRight,
  Zap, Target, Activity,
} from "lucide-react";
 
export const Route = createFileRoute("/_authenticated/matches/$matchId/score")({
  component: ScorePage,
});
 
type Match = {
  id: string; team_a_id: string; team_b_id: string; overs: number;
  status: "scheduled" | "live" | "completed"; current_innings: number;
  result_text: string | null;
  team_a: { id: string; name: string; short_name: string | null; jersey_color: string | null };
  team_b: { id: string; name: string; short_name: string | null; jersey_color: string | null };
};
type Innings = {
  id: string; innings_no: number; batting_team_id: string; bowling_team_id: string;
  runs: number; wickets: number; balls: number; extras: number;
  target: number | null; completed: boolean;
  striker_id: string | null; non_striker_id: string | null; bowler_id: string | null;
};
type Ball = {
  id: string; ball_index: number; over_number: number; ball_in_over: number;
  runs: number; extra_type: "wide" | "noball" | "bye" | "legbye" | null;
  is_wicket: boolean; batter_id: string | null; non_striker_id: string | null;
  bowler_id: string | null; dismissed_player_id: string | null; wicket_type: string | null;
};
type Member = { id: string; player_name: string; jersey_number: number | null };
type ExtraKind = "wide" | "noball" | "bye" | "legbye";
 
/* ---------- Wicket modal types ---------- */
type WicketMode =
  | "bowled" | "lbw" | "caught" | "caught_behind"
  | "runout" | "stumped" | "hit_wicket" | "retired_hurt";
 
const WICKET_MODES: { value: WicketMode; label: string; emoji: string; needsFielder?: "catcher" | "thrower"; needsDismissed?: boolean }[] = [
  { value: "bowled",        label: "Bowled",         emoji: "🎳" },
  { value: "lbw",           label: "LBW",            emoji: "🦵" },
  { value: "caught",        label: "Caught",         emoji: "🙌", needsFielder: "catcher" },
  { value: "caught_behind", label: "Caught Behind",  emoji: "🧤", needsFielder: "catcher" },
  { value: "stumped",       label: "Stumped",        emoji: "🪵",  needsFielder: "catcher" },
  { value: "runout",        label: "Run Out",        emoji: "🏃", needsFielder: "thrower", needsDismissed: true },
  { value: "hit_wicket",    label: "Hit Wicket",     emoji: "💥" },
  { value: "retired_hurt",  label: "Retired Hurt",   emoji: "🩹" },
];
 
/* ================================================================
   WICKET MODAL
================================================================ */
function WicketModal({
  battingSquad, bowlingSquad, striker, nonStriker, runs, extra,
  onConfirm, onCancel,
}: {
  battingSquad: Member[]; bowlingSquad: Member[];
  striker: string | null; nonStriker: string | null;
  runs: number; extra: ExtraKind | null;
  onConfirm: (params: {
    runs: number; extra_type: ExtraKind | null;
    is_wicket: boolean; wicket_type: string;
    dismissed_player_id: string | null; fielder_id: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<WicketMode | null>(null);
  const [fielderId, setFielderId] = useState<string>("");
  const [dismissedId, setDismissedId] = useState<string>(striker ?? "");
 
  const chosen = WICKET_MODES.find((w) => w.value === mode);
  const isRetiredHurt = mode === "retired_hurt";
 
  const confirm = () => {
    if (!mode) return;
    onConfirm({
      runs,
      extra_type: extra,
      is_wicket: !isRetiredHurt,
      wicket_type: mode,
      dismissed_player_id: dismissedId || striker,
      fielder_id: fielderId || null,
    });
  };
 
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-destructive/15 border-b border-destructive/20 px-5 py-4">
          <div className="text-[10px] uppercase tracking-widest text-destructive font-bold mb-0.5">
            {isRetiredHurt ? "🩹 Retired Hurt" : "🚨 Wicket"}
          </div>
          <div className="font-display text-xl text-foreground">How was {battingSquad.find(m => m.id === (dismissedId || striker))?.player_name ?? "batter"} out?</div>
        </div>
 
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Wicket modes grid */}
          <div className="grid grid-cols-2 gap-2">
            {WICKET_MODES.map((w) => (
              <button
                key={w.value}
                onClick={() => { setMode(w.value); setFielderId(""); }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-95 ${
                  mode === w.value
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : "border-border bg-background text-foreground hover:border-destructive/40"
                }`}
              >
                <span>{w.emoji}</span> {w.label}
              </button>
            ))}
          </div>
 
          {/* Run out — pick who got out (striker or non-striker) */}
          {mode === "runout" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Who got run out?</p>
              <div className="grid grid-cols-2 gap-2">
                {[striker, nonStriker].filter(Boolean).map((id) => {
                  const name = battingSquad.find(m => m.id === id)?.player_name ?? "—";
                  return (
                    <button
                      key={id}
                      onClick={() => setDismissedId(id!)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        dismissedId === id ? "border-destructive bg-destructive/10 text-destructive" : "border-border hover:border-destructive/30"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
 
          {/* Fielder picker for caught / stumped / run out */}
          {chosen?.needsFielder && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                {chosen.needsFielder === "catcher" ? "Fielder / keeper" : "Throw by"}
              </p>
              <select
                className="input w-full"
                value={fielderId}
                onChange={(e) => setFielderId(e.target.value)}
              >
                <option value="">Select fielder…</option>
                {bowlingSquad.map((m) => (
                  <option key={m.id} value={m.id}>{m.player_name}{m.jersey_number != null ? ` #${m.jersey_number}` : ""}</option>
                ))}
              </select>
            </div>
          )}
 
          {/* Retired hurt info */}
          {isRetiredHurt && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
              Player retires hurt — not counted as a wicket. They can return to bat later.
            </div>
          )}
        </div>
 
        {/* Actions */}
        <div className="border-t border-border p-4 grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="rounded-xl border border-border bg-background py-2.5 text-sm font-semibold transition hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!mode}
            className="rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground transition active:scale-95 disabled:opacity-50"
          >
            {isRetiredHurt ? "Retire Hurt" : "Confirm Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
/* ================================================================
   MAIN SCORE PAGE
================================================================ */
function ScorePage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [innings, setInnings] = useState<Innings | null>(null);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [battingSquad, setBattingSquad] = useState<Member[]>([]);
  const [bowlingSquad, setBowlingSquad] = useState<Member[]>([]);
  const [extra, setExtra] = useState<ExtraKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [breakDismissed, setBreakDismissed] = useState(false);
 
  // Wicket modal state
  const [wicketPending, setWicketPending] = useState<{ runs: number; extra: ExtraKind | null } | null>(null);
 
  const load = useCallback(async () => {
    const { data: m } = await supabase
      .from("matches")
      .select("id, team_a_id, team_b_id, overs, status, current_innings, result_text, team_a:teams!matches_team_a_id_fkey(id, name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(id, name, short_name, jersey_color)")
      .eq("id", matchId).maybeSingle();
    if (!m) return;
    setMatch(m as unknown as Match);
    const { data: inn } = await supabase.from("innings").select("*")
      .eq("match_id", matchId).eq("innings_no", (m as { current_innings: number }).current_innings).maybeSingle();
    const innRow = (inn as Innings) ?? null;
    setInnings(innRow);
    if (innRow) {
      const [{ data: bs }, { data: bat }, { data: bowl }] = await Promise.all([
        supabase.from("balls")
          .select("id, ball_index, over_number, ball_in_over, runs, extra_type, is_wicket, batter_id, non_striker_id, bowler_id, dismissed_player_id, wicket_type")
          .eq("innings_id", innRow.id).order("ball_index", { ascending: false }).limit(48),
        supabase.from("team_members").select("id, player_name, jersey_number").eq("team_id", innRow.batting_team_id).order("jersey_number", { nullsFirst: false }),
        supabase.from("team_members").select("id, player_name, jersey_number").eq("team_id", innRow.bowling_team_id).order("jersey_number", { nullsFirst: false }),
      ]);
      setBalls((bs as Ball[]) ?? []);
      setBattingSquad((bat as Member[]) ?? []);
      setBowlingSquad((bowl as Member[]) ?? []);
    }
  }, [matchId]);
 
  useEffect(() => { load(); }, [load]);
 
  const battingTeam = match && innings
    ? match.team_a.id === innings.batting_team_id ? match.team_a : match.team_b
    : null;
 
  const oversStr = innings ? `${Math.floor(innings.balls / 6)}.${innings.balls % 6}` : "0.0";
  const totalAllowed = (match?.overs ?? 0) * 6;
 
  // Current over balls only
  const currentOverNumber = innings ? Math.floor(innings.balls / 6) : 0;
  const currentOverBalls = [...balls].reverse().filter((b) => b.over_number === currentOverNumber);
 
  const runRate = useMemo(() => {
    if (!innings || innings.balls === 0) return 0;
    return (innings.runs / innings.balls) * 6;
  }, [innings]);
 
  const reqRunRate = useMemo(() => {
    if (!innings?.target || !match) return null;
    const ballsLeft = match.overs * 6 - innings.balls;
    if (ballsLeft <= 0) return null;
    return ((innings.target - innings.runs) / ballsLeft) * 6;
  }, [innings, match]);
 
  const batterStats = useMemo(() => {
    if (!innings?.striker_id) return null;
    const mine = balls.filter((b) => b.batter_id === innings.striker_id);
    let runs = 0, faced = 0, fours = 0, sixes = 0;
    mine.forEach((b) => {
      if (b.extra_type !== "wide") faced++;
      const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
      if (isBatRun) {
        const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
        runs += r;
        if (r === 4) fours++;
        if (r === 6) sixes++;
      }
    });
    return { runs, faced, fours, sixes };
  }, [balls, innings?.striker_id]);
 
  const bowlerStats = useMemo(() => {
    if (!innings?.bowler_id) return null;
    const mine = balls.filter((b) => b.bowler_id === innings.bowler_id);
    let runs = 0, legal = 0, wkts = 0;
    mine.forEach((b) => {
      runs += b.runs;
      if (b.extra_type !== "wide" && b.extra_type !== "noball") legal++;
      if (b.is_wicket && b.wicket_type !== "runout" && b.wicket_type !== "retired_hurt") wkts++;
    });
    return { runs, legal, overs: `${Math.floor(legal / 6)}.${legal % 6}`, wkts };
  }, [balls, innings?.bowler_id]);
 
  const finishInnings = async (current: Innings) => {
    if (!match) return;
    await supabase.from("innings").update({ completed: true }).eq("id", current.id);
    if (current.innings_no === 1) {
      const { error } = await supabase.from("innings").insert({
        match_id: match.id, innings_no: 2,
        batting_team_id: current.bowling_team_id,
        bowling_team_id: current.batting_team_id,
        target: current.runs + 1,
      });
      if (error) { toast.error(error.message); return; }
      await supabase.from("matches").update({ current_innings: 2 }).eq("id", match.id);
      toast.success(`Innings break — Target: ${current.runs + 1}`);
    } else {
      const firstInnings = await supabase.from("innings").select("runs").eq("match_id", match.id).eq("innings_no", 1).maybeSingle();
      const target = (firstInnings.data?.runs ?? 0) + 1;
      let winnerId: string | null = null;
      let result = "Match tied";
      if (current.runs >= target) {
        winnerId = current.batting_team_id;
        const w = match.team_a.id === winnerId ? match.team_a : match.team_b;
        result = `${w.name} won by ${10 - current.wickets} wickets`;
      } else if (current.runs < target - 1) {
        winnerId = current.bowling_team_id;
        const w = match.team_a.id === winnerId ? match.team_a : match.team_b;
        result = `${w.name} won by ${target - 1 - current.runs} runs`;
      }
      await supabase.from("matches").update({ status: "completed", winner_team_id: winnerId, result_text: result, completed_at: new Date().toISOString() }).eq("id", match.id);
      toast.success(result);
    }
    load();
  };
 
  const setPlayer = async (field: "striker_id" | "non_striker_id" | "bowler_id", value: string | null) => {
    if (!innings) return;
    await supabase.from("innings").update({ [field]: value } as never).eq("id", innings.id);
    setInnings({ ...innings, [field]: value });
  };
 
  const addBall = async (params: {
    runs: number; extra_type?: ExtraKind | null;
    is_wicket?: boolean; wicket_type?: string | null;
    dismissed_player_id?: string | null; fielder_id?: string | null;
  }) => {
    if (!innings || !match || innings.completed || match.status === "completed") return;
    if (!innings.striker_id || !innings.non_striker_id || !innings.bowler_id) {
      toast.error("Pick striker, non-striker & bowler first"); return;
    }
    setBusy(true);
    const isRetiredHurt = params.wicket_type === "retired_hurt";
    const isLegal = params.extra_type !== "wide" && params.extra_type !== "noball";
    const penalty = !isLegal ? 1 : 0;
    const totalRunsThisBall = params.runs + penalty;
    const isExtra = params.extra_type != null;
    const extrasAdd = isExtra ? totalRunsThisBall : 0;
    const nextBallIndex = balls.length > 0 ? Math.max(...balls.map((b) => b.ball_index)) + 1 : 1;
    const legalBefore = innings.balls;
    const over_number = Math.floor(legalBefore / 6);
    const ball_in_over = (legalBefore % 6) + 1;
 
    const { error: bErr } = await supabase.from("balls").insert({
      innings_id: innings.id,
      ball_index: nextBallIndex,
      over_number, ball_in_over,
      runs: isRetiredHurt ? 0 : totalRunsThisBall,
      extra_type: params.extra_type ?? null,
      is_wicket: !!params.is_wicket && !isRetiredHurt,
      wicket_type: params.wicket_type ?? null,
      batter_id: innings.striker_id,
      non_striker_id: innings.non_striker_id,
      bowler_id: innings.bowler_id,
      dismissed_player_id: params.dismissed_player_id ?? (params.is_wicket && !isRetiredHurt ? innings.striker_id : null),
    });
    if (bErr) { setBusy(false); return toast.error(bErr.message); }
 
    const newRuns = innings.runs + (isRetiredHurt ? 0 : totalRunsThisBall);
    const newWickets = innings.wickets + (params.is_wicket && !isRetiredHurt ? 1 : 0);
    const newBalls = innings.balls + (isLegal && !isRetiredHurt ? 1 : 0);
    const newExtras = innings.extras + (isExtra && !isRetiredHurt ? extrasAdd : 0);
 
    const batRuns = params.runs;
    const rotateForOdd = (isLegal || params.extra_type === "bye" || params.extra_type === "legbye") ? batRuns % 2 === 1 : params.extra_type === "noball" && params.runs % 2 === 1;
    const endOfOver = isLegal && !isRetiredHurt && newBalls > 0 && newBalls % 6 === 0;
 
    let newStriker: string | null = innings.striker_id;
    let newNonStriker: string | null = innings.non_striker_id;
    if (rotateForOdd) [newStriker, newNonStriker] = [newNonStriker, newStriker];
    if (endOfOver) [newStriker, newNonStriker] = [newNonStriker, newStriker];
    if (params.is_wicket && !isRetiredHurt) {
      // For run out of non-striker, clear non-striker instead
      if (params.wicket_type === "runout" && params.dismissed_player_id === innings.non_striker_id) {
        newNonStriker = null;
      } else {
        newStriker = null;
      }
    }
    if (isRetiredHurt) newStriker = null; // send retired hurt batter off
 
    const { error: iErr } = await supabase.from("innings").update({ runs: newRuns, wickets: newWickets, balls: newBalls, extras: newExtras, striker_id: newStriker, non_striker_id: newNonStriker }).eq("id", innings.id);
    if (iErr) { setBusy(false); return toast.error(iErr.message); }
    setExtra(null);
    setWicketPending(null);
    await load();
 
    const allOutAt = battingSquad.length > 1 ? battingSquad.length - 1 : 10;
    if (innings.innings_no === 2 && innings.target && newRuns >= innings.target) {
      await finishInnings({ ...innings, runs: newRuns, wickets: newWickets, balls: newBalls });
    } else if (newBalls >= totalAllowed || newWickets >= allOutAt) {
      if (newWickets >= allOutAt) toast(`All out! ${battingTeam?.name} ${newRuns}/${newWickets}`, { icon: "🚨" });
      await finishInnings({ ...innings, runs: newRuns, wickets: newWickets, balls: newBalls });
    } else if (endOfOver) {
      toast("Over complete — pick the next bowler", { icon: "🔁" });
    }
    setBusy(false);
  };
 
  const undo = async () => {
    if (!innings || balls.length === 0) return;
    setBusy(true);
    const last = balls[0];
    const isLegal = last.extra_type !== "wide" && last.extra_type !== "noball";
    const isExtra = last.extra_type != null;
    await supabase.from("balls").delete().eq("id", last.id);
    await supabase.from("innings").update({
      runs: Math.max(0, innings.runs - last.runs),
      wickets: Math.max(0, innings.wickets - (last.is_wicket ? 1 : 0)),
      balls: Math.max(0, innings.balls - (isLegal ? 1 : 0)),
      extras: Math.max(0, innings.extras - (isExtra ? last.runs : 0)),
      striker_id: last.batter_id, non_striker_id: last.non_striker_id, bowler_id: last.bowler_id,
    }).eq("id", innings.id);
    await load();
    setBusy(false);
  };
 
  const endMatch = async () => {
    if (!match || !innings) return;
    if (!window.confirm("End the match now? The current score will decide the result.")) return;
    setBusy(true);
    await supabase.from("innings").update({ completed: true }).eq("id", innings.id);
    let winnerId: string | null = null;
    let result = "Match ended — no result";
    if (innings.innings_no === 1) {
      if (innings.runs > 0) {
        winnerId = innings.batting_team_id;
        result = `${(match.team_a.id === winnerId ? match.team_a : match.team_b).name} won — match ended early`;
      }
    } else {
      const first = await supabase.from("innings").select("runs").eq("match_id", match.id).eq("innings_no", 1).maybeSingle();
      const firstRuns = first.data?.runs ?? 0;
      if (innings.runs > firstRuns) winnerId = innings.batting_team_id;
      else if (innings.runs < firstRuns) winnerId = innings.bowling_team_id;
      if (winnerId) {
        const w = match.team_a.id === winnerId ? match.team_a : match.team_b;
        const margin = winnerId === innings.batting_team_id ? `by ${10 - innings.wickets} wickets` : `by ${firstRuns - innings.runs} runs`;
        result = `${w.name} won ${margin}`;
      } else { result = "Match tied"; }
    }
    await supabase.from("matches").update({ status: "completed", winner_team_id: winnerId, result_text: result, completed_at: new Date().toISOString() }).eq("id", match.id);
    toast.success(result);
    setBusy(false);
    await load();
  };
 
  /* ---- Early returns ---- */
  if (!match) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10"><div className="h-40 animate-pulse rounded-xl border border-border bg-card" /></div>
    </div>
  );
 
  if (match.status === "completed") return <CompletedScreen match={match} matchId={matchId} battingSquad={battingSquad} bowlingSquad={bowlingSquad} />;
 
  if (!innings || !battingTeam) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Loading innings…</div>
    </div>
  );
 
  if (innings.innings_no === 2 && innings.balls === 0 && innings.runs === 0 && innings.wickets === 0 && innings.target && !breakDismissed) {
    const bowlingTeam = match.team_a.id === innings.bowling_team_id ? match.team_a : match.team_b;
    return (
      <div className="min-h-screen bg-background"><Navbar />
        <main className="mx-auto max-w-xl px-4 py-10 text-center sm:px-6">
          <div className="rounded-2xl border border-accent/40 bg-card p-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">● Innings Break</div>
            <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">{bowlingTeam.name}</h1>
            <div className="mt-1 text-sm text-muted-foreground">finished on <span className="font-mono text-foreground">{innings.target - 1}</span></div>
            <div className="my-7 rounded-xl border border-primary/40 bg-primary/10 p-6">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Target for {battingTeam.name}</div>
              <div className="mt-1 font-display text-7xl text-primary tabular-nums">{innings.target}</div>
              <div className="mt-1 text-sm text-muted-foreground">from <span className="font-mono">{match.overs}</span> overs · <span className="font-mono">{(innings.target / match.overs).toFixed(2)}</span> rpo required</div>
            </div>
            <button onClick={() => setBreakDismissed(true)} className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110">
              Start 2nd innings 🏏
            </button>
          </div>
        </main>
      </div>
    );
  }
 
  const runBtns: number[] = [0, 1, 2, 3, 4, 6];
  const availableBatters = battingSquad.filter((m) => m.id !== innings.striker_id && m.id !== innings.non_striker_id);
  const color = battingTeam.jersey_color || "#003527";
 
  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Wicket modal */}
      {wicketPending && (
        <WicketModal
          battingSquad={battingSquad}
          bowlingSquad={bowlingSquad}
          striker={innings.striker_id}
          nonStriker={innings.non_striker_id}
          runs={wicketPending.runs}
          extra={wicketPending.extra}
          onConfirm={(params) => addBall(params)}
          onCancel={() => { setWicketPending(null); setBusy(false); }}
        />
      )}
 
      <Navbar />
      <main className="mx-auto max-w-lg px-3 py-4 sm:px-4 sm:py-6">
 
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <Link to="/matches" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Matches
          </Link>
          <button onClick={() => navigate({ to: "/match/$matchId", params: { matchId } })} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Eye className="h-3.5 w-3.5" /> Public view
          </button>
        </div>
 
        {/* ── PREMIUM SCOREBOARD ── */}
        <section
          className="relative overflow-hidden rounded-2xl p-5 pb-4 shadow-2xl"
          style={{ background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)` }}
        >
          {/* Background pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border-2 border-white" />
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-white" />
            <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/2 translate-y-1/2 rounded-full border border-white" />
          </div>
 
          {/* Team + live badge */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/20 font-display text-sm font-bold text-white">
                {(battingTeam.short_name || battingTeam.name).slice(0, 3).toUpperCase()}
              </span>
              <span className="font-display text-lg text-white">{battingTeam.name}</span>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Live
            </span>
          </div>
 
          {/* Big score */}
          <div className="relative mt-3 text-center">
            <div className="font-display text-[72px] leading-none tabular-nums text-white">
              {innings.runs}<span className="text-white/50 text-5xl">/{innings.wickets}</span>
            </div>
            <div className="mt-1 font-mono text-sm text-white/70">
              {oversStr} / {match.overs} ov · Extras {innings.extras}
            </div>
          </div>
 
          {/* Target bar */}
          {innings.innings_no === 2 && innings.target && (
            <div className="relative mt-3 rounded-xl bg-black/20 p-3 text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/60">Target</div>
              <div className="font-display text-2xl text-white tabular-nums">{innings.target}</div>
              <div className="text-xs text-white/70">
                Need <b className="text-white">{Math.max(0, innings.target - innings.runs)}</b> off <b className="text-white">{Math.max(0, totalAllowed - innings.balls)}</b> balls
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, (innings.runs / innings.target) * 100)}%` }} />
              </div>
            </div>
          )}
 
          {/* Run rate row */}
          <div className="relative mt-3 grid grid-cols-3 gap-2">
            <StatChip label="Run Rate" value={runRate.toFixed(2)} icon={<Activity className="h-3 w-3" />} />
            {reqRunRate != null
              ? <StatChip label="Req. RR" value={reqRunRate > 0 ? reqRunRate.toFixed(2) : "—"} icon={<Target className="h-3 w-3" />} accent />
              : <StatChip label="Innings" value={`${innings.innings_no}`} icon={<Zap className="h-3 w-3" />} />}
            <StatChip label="Wickets" value={`${innings.wickets}/10`} icon={<Star className="h-3 w-3" />} />
          </div>
        </section>
 
        {/* ── PLAYERS ── */}
        <section className="mt-3 rounded-xl border border-border bg-card overflow-hidden">
          {/* Striker */}
          <div className="border-b border-border/50 px-3 py-2.5 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-primary font-bold">Striker ✦</div>
                <select className="mt-0.5 bg-transparent font-semibold text-sm text-foreground focus:outline-none cursor-pointer"
                  value={innings.striker_id ?? ""} onChange={(e) => setPlayer("striker_id", e.target.value || null)}>
                  <option value="">Select…</option>
                  {battingSquad.filter(m => m.id !== innings.non_striker_id).map(m => (
                    <option key={m.id} value={m.id}>{m.player_name}{m.jersey_number != null ? ` #${m.jersey_number}` : ""}</option>
                  ))}
                </select>
              </div>
              {batterStats && (
                <div className="text-right">
                  <span className="font-display text-2xl tabular-nums text-primary">{batterStats.runs}</span>
                  <span className="text-muted-foreground text-xs ml-1">({batterStats.faced})</span>
                  <div className="text-[10px] text-muted-foreground">{batterStats.fours}×4 · {batterStats.sixes}×6</div>
                </div>
              )}
            </div>
          </div>
 
          {/* Non-striker + Bowler */}
          <div className="grid grid-cols-2 divide-x divide-border/50">
            <div className="px-3 py-2.5">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Non-striker</div>
              <select className="mt-0.5 w-full bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                value={innings.non_striker_id ?? ""} onChange={(e) => setPlayer("non_striker_id", e.target.value || null)}>
                <option value="">Select…</option>
                {battingSquad.filter(m => m.id !== innings.striker_id).map(m => (
                  <option key={m.id} value={m.id}>{m.player_name}{m.jersey_number != null ? ` #${m.jersey_number}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Bowler</div>
                {bowlerStats && <span className="font-mono text-[10px] text-muted-foreground">{bowlerStats.overs}-{bowlerStats.runs}-{bowlerStats.wkts}</span>}
              </div>
              <select className="mt-0.5 w-full bg-transparent text-sm text-foreground focus:outline-none cursor-pointer"
                value={innings.bowler_id ?? ""} onChange={(e) => setPlayer("bowler_id", e.target.value || null)}>
                <option value="">Select…</option>
                {bowlingSquad.map(m => (
                  <option key={m.id} value={m.id}>{m.player_name}{m.jersey_number != null ? ` #${m.jersey_number}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
 
        {/* Swap strike */}
        {innings.striker_id && innings.non_striker_id && (
          <button onClick={async () => {
            await supabase.from("innings").update({ striker_id: innings.non_striker_id, non_striker_id: innings.striker_id }).eq("id", innings.id);
            load();
          }} className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-3 w-3" /> Swap strike
          </button>
        )}
 
        {/* ── THIS OVER ── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-xl border border-border bg-card/60 px-3 py-2.5">
          <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold pr-1 border-r border-border mr-1">
            Over {currentOverNumber + 1}
          </span>
          {currentOverBalls.length === 0
            ? <span className="text-xs text-muted-foreground italic">No balls yet</span>
            : currentOverBalls.map((b) => (
              <span key={b.id} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${
                b.is_wicket ? "bg-destructive text-destructive-foreground"
                : b.extra_type ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : b.runs >= 6 ? "bg-primary text-primary-foreground"
                : b.runs === 4 ? "bg-primary/25 text-primary"
                : "bg-secondary text-foreground"
              }`}>
                {b.is_wicket ? "W"
                  : b.extra_type === "wide" ? `wd`
                  : b.extra_type === "noball" ? `nb`
                  : b.extra_type === "bye" ? `b${b.runs}`
                  : b.extra_type === "legbye" ? `lb${b.runs}`
                  : b.runs}
              </span>
            ))
          }
          {/* Empty circles for remaining balls */}
          {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
            <span key={`empty-${i}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-border text-xs text-border">·</span>
          ))}
        </div>
 
        {/* ── EXTRAS ── */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {(["wide", "noball", "bye", "legbye"] as ExtraKind[]).map((k) => {
            const active = extra === k;
            const labels = { wide: "Wide", noball: "No-ball", bye: "Bye", legbye: "Leg-bye" };
            return (
              <button key={k} onClick={() => setExtra(active ? null : k)} disabled={busy}
                className={`h-10 rounded-lg border text-[11px] font-semibold uppercase tracking-wide transition ${
                  active ? "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}>
                {labels[k]}
              </button>
            );
          })}
        </div>
 
        {extra && (
          <p className="mt-1.5 text-center text-[11px] text-amber-600 dark:text-amber-400">
            <span className="font-bold">{extra}</span> selected — tap a run to log
          </p>
        )}
 
        {/* ── RUN BUTTONS ── */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {runBtns.map((r) => (
            <button key={r} disabled={busy}
              onClick={() => addBall({ runs: r, extra_type: extra })}
              className={`h-16 sm:h-20 rounded-2xl border font-display text-3xl sm:text-4xl tracking-wide transition active:scale-95 disabled:opacity-60 ${
                r === 4 ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : r === 6 ? "border-primary bg-primary text-primary-foreground hover:brightness-110"
                : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5"
              }`}>
              {r}
            </button>
          ))}
        </div>
 
        {/* ── WICKET + RETIRED HURT + UNDO ── */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button disabled={busy}
            onClick={() => { setBusy(true); setWicketPending({ runs: 0, extra }); }}
            className="col-span-2 h-14 rounded-2xl bg-destructive font-display text-2xl tracking-wide text-destructive-foreground transition active:scale-95 disabled:opacity-60">
            WICKET
          </button>
          <button disabled={busy || balls.length === 0} onClick={undo}
            className="inline-flex h-14 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card font-display text-lg tracking-wide transition active:scale-95 disabled:opacity-50">
            <Undo2 className="h-5 w-5" />
          </button>
        </div>
 
        {/* Retired Hurt button */}
        <button disabled={busy || !innings.striker_id}
          onClick={() => { setBusy(true); setWicketPending({ runs: 0, extra: null }); }}
          className="mt-2 w-full h-10 rounded-xl border border-amber-400/40 bg-amber-400/10 text-sm font-semibold text-amber-600 dark:text-amber-400 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
          🩹 Retired Hurt
        </button>
 
        {/* New batter prompt */}
        {!innings.striker_id && availableBatters.length > 0 && (
          <div className="mt-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">New batter to crease</p>
            <div className="flex flex-wrap gap-2">
              {availableBatters.map((m) => (
                <button key={m.id} onClick={() => setPlayer("striker_id", m.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/40 active:scale-95">
                  {m.player_name}
                  {m.jersey_number != null && <span className="font-mono text-[10px] text-muted-foreground">#{m.jersey_number}</span>}
                  <ChevronRight className="h-3 w-3 text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}
 
        {/* End match */}
        <div className="mt-6 border-t border-border pt-4">
          <button type="button" onClick={endMatch} disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition active:scale-95 hover:bg-destructive/20 disabled:opacity-50">
            <Flag className="h-4 w-4" /> End match
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Ends match with current score as result.</p>
        </div>
      </main>
    </div>
  );
}
 
/* ── Stat chip inside scoreboard ── */
function StatChip({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-black/20 px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-white/60 text-[9px] uppercase tracking-wider mb-0.5">
        {icon} {label}
      </div>
      <div className={`font-display text-base tabular-nums ${accent ? "text-yellow-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
 
/* ── Completed screen with MOTM ── */
function CompletedScreen({ match, matchId, battingSquad, bowlingSquad }: {
  match: Match; matchId: string; battingSquad: Member[]; bowlingSquad: Member[];
}) {
  const [motmId, setMotmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const allPlayers = [...battingSquad, ...bowlingSquad].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
 
  useEffect(() => {
    supabase.from("matches").select("motm_player_id").eq("id", matchId).maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        const id: string | null = data?.motm_player_id ?? null;
        if (id) { setMotmId(id); setSaved(true); }
      });
  }, [matchId]);
 
  const saveMotm = async () => {
    if (!motmId) return;
    setSaving(true);
    await supabase.from("matches").update({ motm_player_id: motmId } as never).eq("id", matchId);
    setSaving(false); setSaved(true);
    toast.success("Man of the Match saved 🏆");
  };
 
  const motmPlayer = allPlayers.find((p) => p.id === motmId);
 
  return (
    <div className="min-h-screen bg-background"><Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-6 text-center">
          <div className="text-[10px] uppercase tracking-widest text-primary">Match Result</div>
          <h1 className="mt-1 font-display text-3xl text-primary">{match.result_text}</h1>
        </div>
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-display text-xl"><Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> Man of the Match</div>
          {saved && motmPlayer ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-yellow-400/20 text-yellow-500 font-display text-lg">{motmPlayer.player_name.slice(0, 1)}</div>
              <div><div className="font-display text-lg">{motmPlayer.player_name}</div><div className="text-xs text-muted-foreground">Man of the Match 🏆</div></div>
              <button onClick={() => setSaved(false)} className="ml-auto text-xs text-muted-foreground underline">Change</button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <select value={motmId ?? ""} onChange={(e) => setMotmId(e.target.value || null)} className="input w-full">
                <option value="">Select a player…</option>
                {allPlayers.map((p) => <option key={p.id} value={p.id}>{p.player_name}{p.jersey_number != null ? ` (#${p.jersey_number})` : ""}</option>)}
              </select>
              <button onClick={saveMotm} disabled={!motmId || saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
                <Star className="h-4 w-4" /> {saving ? "Saving…" : "Save Man of the Match"}
              </button>
            </div>
          )}
        </div>
        <Link to="/match/$matchId" params={{ matchId }}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40">
          <Eye className="h-4 w-4" /> View full scorecard
        </Link>
      </main>
    </div>
  );
}