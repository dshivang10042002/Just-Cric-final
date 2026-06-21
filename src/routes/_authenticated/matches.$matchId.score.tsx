import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Eye, Undo2, RefreshCw, Flag, Star, ChevronRight,
  Zap, Target, Activity, User,
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
type Member = {
  id: string; player_name: string; jersey_number: number | null;
  avatar_url: string | null;
};
type ExtraKind = "wide" | "noball" | "bye" | "legbye";
 
type WicketMode =
  | "bowled" | "lbw" | "caught" | "caught_behind"
  | "runout" | "stumped" | "hit_wicket" | "retired_hurt";
 
const WICKET_MODES: {
  value: WicketMode; label: string; emoji: string;
  needsFielder?: "catcher" | "thrower"; needsDismissed?: boolean;
}[] = [
  { value: "bowled",        label: "Bowled",        emoji: "🎳" },
  { value: "lbw",           label: "LBW",           emoji: "🦵" },
  { value: "caught",        label: "Caught",        emoji: "🙌", needsFielder: "catcher" },
  { value: "caught_behind", label: "Caught Behind", emoji: "🧤", needsFielder: "catcher" },
  { value: "stumped",       label: "Stumped",       emoji: "🪵", needsFielder: "catcher" },
  { value: "runout",        label: "Run Out",       emoji: "🏃", needsFielder: "thrower", needsDismissed: true },
  { value: "hit_wicket",   label: "Hit Wicket",    emoji: "💥" },
  { value: "retired_hurt", label: "Retired Hurt",  emoji: "🩹" },
];
 
/* ── Player avatar ── */
function PlayerAvatar({ member, size = "md" }: { member: Member | null | undefined; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "h-7 w-7 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  if (!member) return (
    <div className={`${sz} shrink-0 grid place-items-center rounded-full bg-secondary text-muted-foreground`}>
      <User className="h-3.5 w-3.5" />
    </div>
  );
  if (member.avatar_url) return (
    <img src={member.avatar_url} alt={member.player_name} className={`${sz} shrink-0 rounded-full object-cover border border-border`} />
  );
  return (
    <div className={`${sz} shrink-0 grid place-items-center rounded-full bg-primary/15 font-semibold text-primary`}>
      {member.player_name.slice(0, 1).toUpperCase()}
    </div>
  );
}
 
/* ── Player select row (shows photo + name) ── */
function PlayerSelectRow({
  label, value, members, onChange, stat, accent,
}: {
  label: string; value: string | null; members: Member[];
  onChange: (v: string | null) => void; stat?: string; accent?: boolean;
}) {
  const selected = members.find((m) => m.id === value) ?? null;
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div className={`text-[9px] uppercase tracking-widest font-bold mb-1 ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {label}{accent && " ✦"}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
          accent ? "border-primary/30 bg-primary/5" : "border-border bg-background"
        }`}
      >
        <PlayerAvatar member={selected} size="sm" />
        <span className="flex-1 min-w-0 truncate text-sm font-medium">
          {selected ? selected.player_name : <span className="text-muted-foreground">Select…</span>}
        </span>
        {stat && <span className="font-mono text-[10px] text-muted-foreground shrink-0">{stat}</span>}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>
 
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              <div className="h-7 w-7 shrink-0 grid place-items-center rounded-full bg-secondary">
                <User className="h-3.5 w-3.5" />
              </div>
              None
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-secondary ${value === m.id ? "bg-primary/10 text-primary" : "text-foreground"}`}
              >
                <PlayerAvatar member={m} size="sm" />
                <span className="flex-1 truncate font-medium">{m.player_name}</span>
                {m.jersey_number != null && <span className="font-mono text-[10px] text-muted-foreground">#{m.jersey_number}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
 
/* ── Wicket modal ── */
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
 
  const fielderMember = bowlingSquad.find((m) => m.id === fielderId);
 
  const confirm = () => {
    if (!mode) return;
    onConfirm({
      runs, extra_type: extra,
      is_wicket: !isRetiredHurt,
      wicket_type: mode,
      dismissed_player_id: dismissedId || striker,
      fielder_id: fielderId || null,
    });
  };
 
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="border-b border-destructive/20 bg-destructive/10 px-5 py-4">
          <div className="text-[10px] uppercase tracking-widest text-destructive font-bold mb-0.5">
            {isRetiredHurt ? "🩹 Retired Hurt" : "🚨 Wicket"}
          </div>
          <div className="font-display text-lg text-foreground">
            How was{" "}
            <span className="text-destructive">
              {battingSquad.find((m) => m.id === (dismissedId || striker))?.player_name ?? "batter"}
            </span>{" "}
            dismissed?
          </div>
        </div>
 
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Mode grid */}
          <div className="grid grid-cols-2 gap-2">
            {WICKET_MODES.map((w) => (
              <button key={w.value} onClick={() => { setMode(w.value); setFielderId(""); }}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-95 ${
                  mode === w.value
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : "border-border bg-background text-foreground hover:border-destructive/40"
                }`}>
                <span>{w.emoji}</span> {w.label}
              </button>
            ))}
          </div>
 
          {/* Run out — pick who got out */}
          {mode === "runout" && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">Who got run out?</p>
              <div className="grid grid-cols-2 gap-2">
                {[striker, nonStriker].filter(Boolean).map((id) => {
                  const mem = battingSquad.find((m) => m.id === id);
                  return (
                    <button key={id} onClick={() => setDismissedId(id!)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${
                        dismissedId === id ? "border-destructive bg-destructive/10" : "border-border hover:border-destructive/30"
                      }`}>
                      <PlayerAvatar member={mem} size="sm" />
                      <span className="text-sm font-medium truncate">{mem?.player_name ?? "—"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
 
          {/* Fielder picker with avatar */}
          {chosen?.needsFielder && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
                {chosen.needsFielder === "catcher" ? "Caught / taken by" : "Thrown by"}
              </p>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                {bowlingSquad.map((m) => (
                  <button key={m.id} onClick={() => setFielderId(m.id)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                      fielderId === m.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/30"
                    }`}>
                    <PlayerAvatar member={m} size="sm" />
                    <span className="font-medium flex-1 text-left">{m.player_name}</span>
                    {m.jersey_number != null && <span className="font-mono text-[10px] text-muted-foreground">#{m.jersey_number}</span>}
                    {fielderId === m.id && <span className="text-primary text-xs font-bold">✓</span>}
                  </button>
                ))}
              </div>
              {fielderMember && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary font-semibold">
                  <PlayerAvatar member={fielderMember} size="sm" />
                  {fielderMember.player_name} selected
                </div>
              )}
            </div>
          )}
 
          {isRetiredHurt && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
              Not counted as a wicket. Player can return to bat later.
            </div>
          )}
        </div>
 
        <div className="border-t border-border p-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded-xl border border-border bg-background py-2.5 text-sm font-semibold transition hover:bg-secondary">
            Cancel
          </button>
          <button onClick={confirm} disabled={!mode}
            className="rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground transition active:scale-95 disabled:opacity-50">
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
  const [wicketPending, setWicketPending] = useState<{ runs: number; extra: ExtraKind | null } | null>(null);
 
  const load = useCallback(async () => {
    const { data: m } = await supabase
      .from("matches")
      .select("id, team_a_id, team_b_id, overs, status, current_innings, result_text, team_a:teams!matches_team_a_id_fkey(id, name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(id, name, short_name, jersey_color)")
      .eq("id", matchId).maybeSingle();
    if (!m) return;
    setMatch(m as unknown as Match);
 
    const { data: inn } = await supabase.from("innings").select("*")
      .eq("match_id", matchId)
      .eq("innings_no", (m as { current_innings: number }).current_innings)
      .maybeSingle();
    const innRow = (inn as Innings) ?? null;
    setInnings(innRow);
 
    if (innRow) {
      const [{ data: bs }, { data: bat }, { data: bowl }] = await Promise.all([
        supabase.from("balls")
          .select("id, ball_index, over_number, ball_in_over, runs, extra_type, is_wicket, batter_id, non_striker_id, bowler_id, dismissed_player_id, wicket_type")
          .eq("innings_id", innRow.id).order("ball_index", { ascending: false }).limit(48),
        supabase.from("team_members")
          .select("id, player_name, jersey_number, profiles(avatar_url)")
          .eq("team_id", innRow.batting_team_id).order("jersey_number", { nullsFirst: false }),
        supabase.from("team_members")
          .select("id, player_name, jersey_number, profiles(avatar_url)")
          .eq("team_id", innRow.bowling_team_id).order("jersey_number", { nullsFirst: false }),
      ]);
 
      // Flatten profile avatar into member
      const flattenMember = (raw: unknown): Member => {
        const r = raw as { id: string; player_name: string; jersey_number: number | null; profiles?: { avatar_url?: string | null } | null };
        return { id: r.id, player_name: r.player_name, jersey_number: r.jersey_number, avatar_url: r.profiles?.avatar_url ?? null };
      };
      setBalls((bs as Ball[]) ?? []);
      setBattingSquad((bat ?? []).map(flattenMember));
      setBowlingSquad((bowl ?? []).map(flattenMember));
    }
  }, [matchId]);
 
  useEffect(() => { load(); }, [load]);
 
  const battingTeam = match && innings
    ? match.team_a.id === innings.batting_team_id ? match.team_a : match.team_b
    : null;
 
  const oversStr = innings ? `${Math.floor(innings.balls / 6)}.${innings.balls % 6}` : "0.0";
  const totalAllowed = (match?.overs ?? 0) * 6;
 
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
      innings_id: innings.id, ball_index: nextBallIndex,
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
    const rotateForOdd = (isLegal || params.extra_type === "bye" || params.extra_type === "legbye")
      ? batRuns % 2 === 1 : params.extra_type === "noball" && params.runs % 2 === 1;
    const endOfOver = isLegal && !isRetiredHurt && newBalls > 0 && newBalls % 6 === 0;
 
    let newStriker: string | null = innings.striker_id;
    let newNonStriker: string | null = innings.non_striker_id;
    if (rotateForOdd) [newStriker, newNonStriker] = [newNonStriker, newStriker];
    if (endOfOver) [newStriker, newNonStriker] = [newNonStriker, newStriker];
    if (params.is_wicket && !isRetiredHurt) {
      if (params.wicket_type === "runout" && params.dismissed_player_id === innings.non_striker_id) {
        newNonStriker = null;
      } else { newStriker = null; }
    }
    if (isRetiredHurt) newStriker = null;
 
    const { error: iErr } = await supabase.from("innings").update({
      runs: newRuns, wickets: newWickets, balls: newBalls, extras: newExtras,
      striker_id: newStriker, non_striker_id: newNonStriker,
    }).eq("id", innings.id);
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
    if (!window.confirm("End the match now?")) return;
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
 
  /* ── Early returns ── */
  if (!match) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10"><div className="h-40 animate-pulse rounded-xl border border-border bg-card" /></div>
    </div>
  );
 
  if (match.status === "completed") return (
    <CompletedScreen match={match} matchId={matchId} battingSquad={battingSquad} bowlingSquad={bowlingSquad} />
  );
 
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
  const strikerMember = battingSquad.find((m) => m.id === innings.striker_id);
  const nonStrikerMember = battingSquad.find((m) => m.id === innings.non_striker_id);
  const bowlerMember = bowlingSquad.find((m) => m.id === innings.bowler_id);
 
  return (
    <div className="min-h-screen bg-background pb-12">
      {wicketPending && (
        <WicketModal
          battingSquad={battingSquad} bowlingSquad={bowlingSquad}
          striker={innings.striker_id} nonStriker={innings.non_striker_id}
          runs={wicketPending.runs} extra={wicketPending.extra}
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
 
        {/* ── PREMIUM SCOREBOARD (no jersey color — clean dark card) ── */}
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-xl p-5">
          {/* Subtle background grid */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
 
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Innings {innings.innings_no}</div>
              <div className="font-display text-lg text-foreground mt-0.5">{battingTeam.name}</div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Live
            </span>
          </div>
 
          {/* Big score */}
          <div className="relative text-center py-2">
            <div className="font-display leading-none tabular-nums" style={{ fontSize: "clamp(56px,14vw,80px)" }}>
              <span className="text-foreground">{innings.runs}</span>
              <span className="text-muted-foreground" style={{ fontSize: "55%" }}>/{innings.wickets}</span>
            </div>
            <div className="mt-1.5 font-mono text-sm text-muted-foreground">
              {oversStr} / {match.overs} ov
              <span className="mx-2 text-border">·</span>
              Extras {innings.extras}
            </div>
          </div>
 
          {/* Target progress */}
          {innings.innings_no === 2 && innings.target && (
            <div className="relative mt-3 rounded-xl border border-border bg-background/50 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">Target <b className="text-foreground">{innings.target}</b></span>
                <span className="text-muted-foreground">Need <b className="text-primary">{Math.max(0, innings.target - innings.runs)}</b> off <b className="text-foreground">{Math.max(0, totalAllowed - innings.balls)}</b> balls</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, (innings.runs / innings.target) * 100)}%` }} />
              </div>
            </div>
          )}
 
          {/* Stats row */}
          <div className="relative mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Run Rate", value: runRate.toFixed(2), icon: <Activity className="h-3 w-3" /> },
              reqRunRate != null
                ? { label: "Req. RR", value: reqRunRate > 0 ? reqRunRate.toFixed(2) : "—", icon: <Target className="h-3 w-3" />, accent: true }
                : { label: "Innings", value: `${innings.innings_no} of 2`, icon: <Zap className="h-3 w-3" /> },
              { label: "Wickets", value: `${innings.wickets}/10`, icon: <Star className="h-3 w-3" /> },
            ].map((s, i) => (
              <div key={i} className={`rounded-xl border px-2 py-2 text-center ${(s as { accent?: boolean }).accent ? "border-primary/30 bg-primary/5" : "border-border bg-background/50"}`}>
                <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{s.icon} {s.label}</div>
                <div className={`font-display text-lg tabular-nums ${(s as { accent?: boolean }).accent ? "text-primary" : "text-foreground"}`}>{s.value}</div>
              </div>
            ))}
          </div>
        </section>
 
        {/* ── PLAYERS ── premium card with avatar dropdowns ── */}
        <section className="mt-3 rounded-xl border border-border bg-card overflow-visible">
          {/* Striker */}
          <div className="border-b border-border px-3 pt-3 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <PlayerSelectRow
                  label="Striker" accent
                  value={innings.striker_id}
                  members={battingSquad.filter((m) => m.id !== innings.non_striker_id)}
                  onChange={(v) => setPlayer("striker_id", v)}
                  stat={batterStats ? `${batterStats.runs}(${batterStats.faced})` : undefined}
                />
              </div>
              {batterStats && (
                <div className="text-right shrink-0 pt-4">
                  <div className="font-display text-2xl tabular-nums text-primary">{batterStats.runs}</div>
                  <div className="text-[10px] text-muted-foreground">{batterStats.fours}×4 · {batterStats.sixes}×6</div>
                </div>
              )}
            </div>
          </div>
 
          {/* Non-striker + Bowler */}
          <div className="grid grid-cols-2 divide-x divide-border px-0">
            <div className="px-3 py-3">
              <PlayerSelectRow
                label="Non-striker"
                value={innings.non_striker_id}
                members={battingSquad.filter((m) => m.id !== innings.striker_id)}
                onChange={(v) => setPlayer("non_striker_id", v)}
              />
            </div>
            <div className="px-3 py-3">
              <PlayerSelectRow
                label="Bowler"
                value={innings.bowler_id}
                members={bowlingSquad}
                onChange={(v) => setPlayer("bowler_id", v)}
                stat={bowlerStats ? `${bowlerStats.overs}-${bowlerStats.runs}-${bowlerStats.wkts}` : undefined}
              />
            </div>
          </div>
        </section>
 
        {/* Swap + at-crease preview */}
        <div className="mt-2 flex items-center justify-between">
          {innings.striker_id && innings.non_striker_id ? (
            <button onClick={async () => {
              await supabase.from("innings").update({ striker_id: innings.non_striker_id, non_striker_id: innings.striker_id }).eq("id", innings.id);
              load();
            }} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3 w-3" /> Swap strike
            </button>
          ) : <div />}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {strikerMember && <><PlayerAvatar member={strikerMember} size="sm" /><span className="font-medium text-foreground">{strikerMember.player_name}</span></>}
            {bowlerMember && <><span className="text-border mx-0.5">vs</span><PlayerAvatar member={bowlerMember} size="sm" /></>}
          </div>
        </div>
 
        {/* ── THIS OVER ── */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="shrink-0 pr-2 border-r border-border mr-1">
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Over</div>
            <div className="font-display text-base text-foreground">{currentOverNumber + 1}</div>
          </div>
          {currentOverBalls.length === 0
            ? <span className="text-xs text-muted-foreground italic">No balls yet</span>
            : currentOverBalls.map((b) => (
              <span key={b.id} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${
                b.is_wicket ? "bg-destructive text-destructive-foreground"
                : b.extra_type ? "border border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                : b.runs >= 6 ? "bg-primary text-primary-foreground"
                : b.runs === 4 ? "border border-primary/40 bg-primary/15 text-primary"
                : "bg-secondary text-foreground"
              }`}>
                {b.is_wicket ? "W" : b.extra_type === "wide" ? "wd" : b.extra_type === "noball" ? "nb"
                  : b.extra_type === "bye" ? `b${b.runs}` : b.extra_type === "legbye" ? `lb${b.runs}` : b.runs}
              </span>
            ))
          }
          {Array.from({ length: Math.max(0, 6 - currentOverBalls.length) }).map((_, i) => (
            <span key={`e-${i}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-border/40 text-[10px] text-border">·</span>
          ))}
        </div>
 
        {/* ── EXTRAS ── */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {(["wide", "noball", "bye", "legbye"] as ExtraKind[]).map((k) => {
            const active = extra === k;
            const labels = { wide: "Wide", noball: "No Ball", bye: "Bye", legbye: "Leg Bye" };
            return (
              <button key={k} onClick={() => setExtra(active ? null : k)} disabled={busy}
                className={`h-10 rounded-xl border text-[11px] font-bold uppercase tracking-wide transition active:scale-95 ${
                  active ? "border-amber-400 bg-amber-400/15 text-amber-600 dark:text-amber-400 shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-amber-400/40 hover:text-foreground"
                }`}>
                {labels[k]}
              </button>
            );
          })}
        </div>
        {extra && (
          <p className="mt-1.5 text-center text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            {extra} selected — tap a run
          </p>
        )}
 
        {/* ── RUN BUTTONS ── */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {runBtns.map((r) => (
            <button key={r} disabled={busy}
              onClick={() => addBall({ runs: r, extra_type: extra })}
              className={`h-16 sm:h-20 rounded-2xl border font-display text-3xl sm:text-4xl tracking-wide transition active:scale-95 disabled:opacity-60 ${
                r === 6 ? "border-primary bg-primary text-primary-foreground shadow-lg hover:brightness-110"
                : r === 4 ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-card/80"
              }`}>
              {r}
            </button>
          ))}
        </div>
 
        {/* ── WICKET / RETIRED HURT / UNDO ── */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button disabled={busy}
            onClick={() => { setBusy(true); setWicketPending({ runs: 0, extra }); }}
            className="col-span-2 h-14 rounded-2xl bg-destructive font-display text-2xl tracking-wide text-destructive-foreground shadow-lg transition active:scale-95 disabled:opacity-60">
            WICKET
          </button>
          <button disabled={busy || balls.length === 0} onClick={undo}
            className="inline-flex h-14 items-center justify-center rounded-2xl border border-border bg-card transition active:scale-95 disabled:opacity-50">
            <Undo2 className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
 
        <button disabled={busy || !innings.striker_id}
          onClick={() => { setBusy(true); setWicketPending({ runs: 0, extra: null }); }}
          className="mt-2 w-full h-10 rounded-xl border border-amber-400/30 bg-amber-400/8 text-sm font-semibold text-amber-600 dark:text-amber-400 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 hover:border-amber-400/50">
          🩹 Retired Hurt
        </button>
 
        {/* New batter prompt */}
        {!innings.striker_id && availableBatters.length > 0 && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-primary">New batter to crease</p>
            <div className="flex flex-wrap gap-2">
              {availableBatters.map((m) => (
                <button key={m.id} onClick={() => setPlayer("striker_id", m.id)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary/40 active:scale-95 transition">
                  <PlayerAvatar member={m} size="sm" />
                  {m.player_name}
                  {m.jersey_number != null && <span className="font-mono text-[10px] text-muted-foreground">#{m.jersey_number}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
 
        {/* End match */}
        <div className="mt-6 border-t border-border pt-4">
          <button type="button" onClick={endMatch} disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-card px-4 py-3 text-sm font-semibold text-destructive/70 transition active:scale-95 hover:border-destructive/40 hover:text-destructive disabled:opacity-50">
            <Flag className="h-4 w-4" /> End match
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Ends match with current score as result.</p>
        </div>
      </main>
    </div>
  );
}
 
/* ── Completed + MOTM ── */
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
          <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">Match Result</div>
          <h1 className="mt-1 font-display text-3xl text-primary">{match.result_text}</h1>
        </div>
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-display text-xl"><Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> Man of the Match</div>
          {saved && motmPlayer ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-yellow-400/40 bg-yellow-400/10 p-4">
              <PlayerAvatar member={motmPlayer} size="lg" />
              <div><div className="font-display text-lg">{motmPlayer.player_name}</div><div className="text-xs text-muted-foreground">Man of the Match 🏆</div></div>
              <button onClick={() => setSaved(false)} className="ml-auto text-xs text-muted-foreground underline">Change</button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                {allPlayers.map((p) => (
                  <button key={p.id} onClick={() => setMotmId(p.id)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                      motmId === p.id ? "border-yellow-400 bg-yellow-400/10 text-foreground" : "border-border bg-background hover:border-yellow-400/40"
                    }`}>
                    <PlayerAvatar member={p} size="sm" />
                    <span className="font-medium flex-1 text-left">{p.player_name}</span>
                    {motmId === p.id && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 shrink-0" />}
                  </button>
                ))}
              </div>
              <button onClick={saveMotm} disabled={!motmId || saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
                <Star className="h-4 w-4" /> {saving ? "Saving…" : "Save Man of the Match"}
              </button>
            </div>
          )}
        </div>
        <Link to="/match/$matchId" params={{ matchId }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40">
          <Eye className="h-4 w-4" /> View full scorecard
        </Link>
      </main>
    </div>
  );
}