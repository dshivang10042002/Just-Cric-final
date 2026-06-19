import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, Undo2, RefreshCw, Flag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/matches/$matchId/score")({
  component: ScorePage,
});

type Match = {
  id: string;
  team_a_id: string;
  team_b_id: string;
  overs: number;
  status: "scheduled" | "live" | "completed";
  current_innings: number;
  result_text: string | null;
  team_a: { id: string; name: string; short_name: string | null; jersey_color: string | null };
  team_b: { id: string; name: string; short_name: string | null; jersey_color: string | null };
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
  completed: boolean;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
};
type Ball = {
  id: string;
  ball_index: number;
  over_number: number;
  ball_in_over: number;
  runs: number;
  extra_type: "wide" | "noball" | "bye" | "legbye" | null;
  is_wicket: boolean;
  batter_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
  dismissed_player_id: string | null;
  wicket_type: string | null;
};
type Member = { id: string; player_name: string; jersey_number: number | null };

type ExtraKind = "wide" | "noball" | "bye" | "legbye";

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

  const load = useCallback(async () => {
    const { data: m } = await supabase
      .from("matches")
      .select(
        "id, team_a_id, team_b_id, overs, status, current_innings, result_text, team_a:teams!matches_team_a_id_fkey(id, name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(id, name, short_name, jersey_color)",
      )
      .eq("id", matchId)
      .maybeSingle();
    if (!m) return;
    setMatch(m as unknown as Match);
    const { data: inn } = await supabase
      .from("innings")
      .select("*")
      .eq("match_id", matchId)
      .eq("innings_no", (m as { current_innings: number }).current_innings)
      .maybeSingle();
    const innRow = (inn as Innings) ?? null;
    setInnings(innRow);
    if (innRow) {
      const [{ data: bs }, { data: bat }, { data: bowl }] = await Promise.all([
        supabase
          .from("balls")
          .select(
            "id, ball_index, over_number, ball_in_over, runs, extra_type, is_wicket, batter_id, non_striker_id, bowler_id, dismissed_player_id, wicket_type",
          )
          .eq("innings_id", innRow.id)
          .order("ball_index", { ascending: false })
          .limit(24),
        supabase
          .from("team_members")
          .select("id, player_name, jersey_number")
          .eq("team_id", innRow.batting_team_id)
          .order("jersey_number", { nullsFirst: false }),
        supabase
          .from("team_members")
          .select("id, player_name, jersey_number")
          .eq("team_id", innRow.bowling_team_id)
          .order("jersey_number", { nullsFirst: false }),
      ]);
      setBalls((bs as Ball[]) ?? []);
      setBattingSquad((bat as Member[]) ?? []);
      setBowlingSquad((bowl as Member[]) ?? []);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  const battingTeam =
    match && innings
      ? match.team_a.id === innings.batting_team_id
        ? match.team_a
        : match.team_b
      : null;

  const oversStr = innings
    ? `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`
    : "0.0";

  const lastSix = [...balls].slice(0, 6).reverse();

  const totalAllowed = (match?.overs ?? 0) * 6;

  // batter/bowler stats
  const batterStats = useMemo(() => {
    if (!innings?.striker_id) return null;
    const mine = balls.filter((b) => b.batter_id === innings.striker_id);
    let runs = 0;
    let faced = 0;
    let fours = 0;
    let sixes = 0;
    mine.forEach((b) => {
      const legal = b.extra_type !== "wide";
      if (legal) faced++;
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
    let runs = 0;
    let legal = 0;
    let wkts = 0;
    mine.forEach((b) => {
      runs += b.runs; // includes wides/noballs penalty + scored
      if (b.extra_type !== "wide" && b.extra_type !== "noball") legal++;
      if (b.is_wicket && b.wicket_type !== "runout") wkts++;
    });
    const overs = `${Math.floor(legal / 6)}.${legal % 6}`;
    return { runs, legal, overs, wkts };
  }, [balls, innings?.bowler_id]);

  const finishInnings = async (current: Innings) => {
    if (!match) return;
    await supabase.from("innings").update({ completed: true }).eq("id", current.id);

    if (current.innings_no === 1) {
      const { error } = await supabase.from("innings").insert({
        match_id: match.id,
        innings_no: 2,
        batting_team_id: current.bowling_team_id,
        bowling_team_id: current.batting_team_id,
        target: current.runs + 1,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      await supabase.from("matches").update({ current_innings: 2 }).eq("id", match.id);
      toast.success(`Innings break — Target: ${current.runs + 1}`);
    } else {
      const firstInnings = await supabase
        .from("innings")
        .select("runs")
        .eq("match_id", match.id)
        .eq("innings_no", 1)
        .maybeSingle();
      const target = (firstInnings.data?.runs ?? 0) + 1;
      let winnerId: string | null = null;
      let result = "Match tied";
      if (current.runs >= target) {
        winnerId = current.batting_team_id;
        const winnerTeam =
          match.team_a.id === winnerId ? match.team_a : match.team_b;
        result = `${winnerTeam.name} won by ${10 - current.wickets} wickets`;
      } else if (current.runs < target - 1) {
        winnerId = current.bowling_team_id;
        const winnerTeam =
          match.team_a.id === winnerId ? match.team_a : match.team_b;
        result = `${winnerTeam.name} won by ${target - 1 - current.runs} runs`;
      }
      await supabase
        .from("matches")
        .update({
          status: "completed",
          winner_team_id: winnerId,
          result_text: result,
          completed_at: new Date().toISOString(),
        })
        .eq("id", match.id);
      toast.success(result);
    }
    load();
  };

  const setPlayer = async (
    field: "striker_id" | "non_striker_id" | "bowler_id",
    value: string | null,
  ) => {
    if (!innings) return;
    const patch =
      field === "striker_id"
        ? { striker_id: value }
        : field === "non_striker_id"
          ? { non_striker_id: value }
          : { bowler_id: value };
    await supabase.from("innings").update(patch).eq("id", innings.id);
    setInnings({ ...innings, [field]: value });
  };

  const addBall = async (params: {
    runs: number;
    extra_type?: ExtraKind | null;
    is_wicket?: boolean;
    wicket_type?: string | null;
  }) => {
    if (!innings || !match || innings.completed || match.status === "completed") return;
    if (!innings.striker_id || !innings.non_striker_id || !innings.bowler_id) {
      toast.error("Pick striker, non-striker & bowler first");
      return;
    }
    setBusy(true);
    const isLegal = params.extra_type !== "wide" && params.extra_type !== "noball";
    const penalty = !isLegal ? 1 : 0;
    const totalRunsThisBall = params.runs + penalty;
    const isExtra = params.extra_type != null;
    const extrasAdd = isExtra ? totalRunsThisBall : 0;

    const nextBallIndex =
      balls.length > 0 ? Math.max(...balls.map((b) => b.ball_index)) + 1 : 1;
    const legalBefore = innings.balls;
    const over_number = Math.floor(legalBefore / 6);
    const ball_in_over = (legalBefore % 6) + 1;

    const { error: bErr } = await supabase.from("balls").insert({
      innings_id: innings.id,
      ball_index: nextBallIndex,
      over_number,
      ball_in_over,
      runs: totalRunsThisBall,
      extra_type: params.extra_type ?? null,
      is_wicket: !!params.is_wicket,
      wicket_type: params.wicket_type ?? null,
      batter_id: innings.striker_id,
      non_striker_id: innings.non_striker_id,
      bowler_id: innings.bowler_id,
      dismissed_player_id: params.is_wicket ? innings.striker_id : null,
    });
    if (bErr) {
      setBusy(false);
      return toast.error(bErr.message);
    }
    const newRuns = innings.runs + totalRunsThisBall;
    const newWickets = innings.wickets + (params.is_wicket ? 1 : 0);
    const newBalls = innings.balls + (isLegal ? 1 : 0);
    const newExtras = innings.extras + extrasAdd;

    // Rotate strike for odd runs (only off the bat, or byes/legbyes — not wides/noballs penalty alone)
    const batRuns = params.extra_type === "noball" ? params.runs : params.runs;
    const rotateForOdd = isLegal || params.extra_type === "bye" || params.extra_type === "legbye"
      ? batRuns % 2 === 1
      : params.extra_type === "noball" && params.runs % 2 === 1;
    // End-of-over swap
    const endOfOver = isLegal && newBalls > 0 && newBalls % 6 === 0;

    let newStriker: string | null = innings.striker_id;
    let newNonStriker: string | null = innings.non_striker_id;
    if (rotateForOdd) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }
    if (endOfOver) {
      [newStriker, newNonStriker] = [newNonStriker, newStriker];
    }
    // On wicket, striker out — clear striker so user must pick next batter
    if (params.is_wicket) {
      newStriker = null;
    }

    const { error: iErr } = await supabase
      .from("innings")
      .update({
        runs: newRuns,
        wickets: newWickets,
        balls: newBalls,
        extras: newExtras,
        striker_id: newStriker,
        non_striker_id: newNonStriker,
      })
      .eq("id", innings.id);
    if (iErr) {
      setBusy(false);
      return toast.error(iErr.message);
    }
    setExtra(null);
    await load();

    const allOutAt = battingSquad.length > 1 ? battingSquad.length - 1 : 10;
    if (innings.innings_no === 2 && innings.target && newRuns >= innings.target) {
      await finishInnings({ ...innings, runs: newRuns, wickets: newWickets, balls: newBalls });
    } else if (newBalls >= totalAllowed || newWickets >= allOutAt) {
      if (newWickets >= allOutAt) {
        const teamName = battingTeam?.name ?? "Team";
        toast(`All out! ${teamName} ${newRuns}/${newWickets}`, { icon: "🚨" });
      }
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
    await supabase
      .from("innings")
      .update({
        runs: Math.max(0, innings.runs - last.runs),
        wickets: Math.max(0, innings.wickets - (last.is_wicket ? 1 : 0)),
        balls: Math.max(0, innings.balls - (isLegal ? 1 : 0)),
        extras: Math.max(0, innings.extras - (isExtra ? last.runs : 0)),
        striker_id: last.batter_id,
        non_striker_id: last.non_striker_id,
        bowler_id: last.bowler_id,
      })
      .eq("id", innings.id);
    await load();
    setBusy(false);
  };

  const endMatch = async () => {
    if (!match || !innings) return;
    const ok = window.confirm(
      "End the match now? The current score will decide the result.",
    );
    if (!ok) return;
    setBusy(true);
    // Mark current innings completed
    await supabase.from("innings").update({ completed: true }).eq("id", innings.id);
    let winnerId: string | null = null;
    let result = "Match ended — no result";
    if (innings.innings_no === 1) {
      // Only one innings played — higher score wins (only one team batted, so they "win" if runs > 0)
      if (innings.runs > 0) {
        winnerId = innings.batting_team_id;
        const winnerTeam = match.team_a.id === winnerId ? match.team_a : match.team_b;
        result = `${winnerTeam.name} won — match ended early`;
      }
    } else {
      const first = await supabase
        .from("innings")
        .select("runs")
        .eq("match_id", match.id)
        .eq("innings_no", 1)
        .maybeSingle();
      const firstRuns = first.data?.runs ?? 0;
      if (innings.runs > firstRuns) {
        winnerId = innings.batting_team_id;
      } else if (innings.runs < firstRuns) {
        winnerId = innings.bowling_team_id;
      }
      if (winnerId) {
        const winnerTeam = match.team_a.id === winnerId ? match.team_a : match.team_b;
        const margin =
          winnerId === innings.batting_team_id
            ? `by ${10 - innings.wickets} wickets`
            : `by ${firstRuns - innings.runs} runs`;
        result = `${winnerTeam.name} won ${margin}`;
      } else {
        result = "Match tied";
      }
    }
    await supabase
      .from("matches")
      .update({
        status: "completed",
        winner_team_id: winnerId,
        result_text: result,
        completed_at: new Date().toISOString(),
      })
      .eq("id", match.id);
    toast.success(result);
    setBusy(false);
    await load();
  };

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (match.status === "completed") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-6">
          <h1 className="font-display text-4xl">Match completed</h1>
          <p className="mt-2 text-lg text-primary">{match.result_text}</p>
          <Link
            to="/match/$matchId"
            params={{ matchId }}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Eye className="h-4 w-4" /> View scorecard
          </Link>
        </main>
      </div>
    );
  }

  if (!innings || !battingTeam) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10 text-muted-foreground">Loading innings…</div>
      </div>
    );
  }

  // Innings break: just rolled into innings 2 and no ball bowled yet
  if (
    innings.innings_no === 2 &&
    innings.balls === 0 &&
    innings.runs === 0 &&
    innings.wickets === 0 &&
    innings.target &&
    !breakDismissed
  ) {
    const firstInningsRuns = innings.target - 1;
    const bowlingTeam =
      match.team_a.id === innings.bowling_team_id ? match.team_a : match.team_b;
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-10 text-center sm:px-6">
          <div className="rounded-2xl border border-accent/40 bg-card p-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
              ● Innings Break
            </div>
            <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
              {bowlingTeam.name}
            </h1>
            <div className="mt-1 text-sm text-muted-foreground">
              finished on{" "}
              <span className="font-mono text-foreground">{firstInningsRuns}</span>
            </div>

            <div className="my-7 rounded-xl border border-primary/40 bg-primary/10 p-6">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Target for {battingTeam.name}
              </div>
              <div className="mt-1 font-display text-7xl text-primary tabular-nums">
                {innings.target}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                from <span className="font-mono">{match.overs}</span> overs ·{" "}
                <span className="font-mono">
                  {(innings.target / match.overs).toFixed(2)}
                </span>{" "}
                rpo required
              </div>
            </div>

            <button
              onClick={() => setBreakDismissed(true)}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
            >
              Start 2nd innings 🏏
            </button>
          </div>
        </main>
      </div>
    );
  }


  const runBtns: number[] = [0, 1, 2, 3, 4, 6];
  const availableBatters = battingSquad.filter(
    (m) => m.id !== innings.striker_id && m.id !== innings.non_striker_id,
  );

  return (
    <div className="min-h-screen bg-background pb-10">
      <Navbar />
      <main className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between">
          <Link
            to="/matches"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Matches
          </Link>
          <button
            onClick={() => navigate({ to: "/match/$matchId", params: { matchId } })}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" /> Public view
          </button>
        </div>

        {/* Scoreboard */}
        <section className="mt-4 rounded-2xl border border-border bg-card p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <span
              className="grid h-8 w-8 place-items-center rounded-md font-display text-sm text-white"
              style={{ backgroundColor: battingTeam.jersey_color || "#003527" }}
            >
              {(battingTeam.short_name || battingTeam.name).slice(0, 3).toUpperCase()}
            </span>
            <span className="font-display text-xl tracking-tight">{battingTeam.name}</span>
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
              ● LIVE
            </span>
          </div>
          <div className="mt-3 font-display text-7xl leading-none text-primary tabular-nums">
            {innings.runs}
            <span className="text-muted-foreground">/</span>
            {innings.wickets}
          </div>
          <div className="mt-1 font-mono text-sm text-muted-foreground">
            {oversStr} / {match.overs} overs · Extras {innings.extras}
          </div>
          {innings.innings_no === 2 && innings.target && (
            <div className="mt-2 text-sm">
              Target <span className="font-mono text-primary">{innings.target}</span> · Need{" "}
              <span className="font-mono text-accent">
                {Math.max(0, innings.target - innings.runs)}
              </span>{" "}
              off{" "}
              <span className="font-mono">{Math.max(0, totalAllowed - innings.balls)}</span> balls
            </div>
          )}
        </section>

        {/* Players */}
        <section className="mt-4 grid gap-2 rounded-xl border border-border bg-card/60 p-3 sm:grid-cols-3">
          <PlayerSelect
            label="Striker"
            value={innings.striker_id}
            members={battingSquad.filter((m) => m.id !== innings.non_striker_id)}
            onChange={(v) => setPlayer("striker_id", v)}
            stat={batterStats ? `${batterStats.runs} (${batterStats.faced})` : undefined}
            accent
          />
          <PlayerSelect
            label="Non-striker"
            value={innings.non_striker_id}
            members={battingSquad.filter((m) => m.id !== innings.striker_id)}
            onChange={(v) => setPlayer("non_striker_id", v)}
          />
          <PlayerSelect
            label="Bowler"
            value={innings.bowler_id}
            members={bowlingSquad}
            onChange={(v) => setPlayer("bowler_id", v)}
            stat={bowlerStats ? `${bowlerStats.overs}–${bowlerStats.runs}–${bowlerStats.wkts}` : undefined}
          />
        </section>

        {/* Quick swap */}
        {innings.striker_id && innings.non_striker_id && (
          <button
            onClick={async () => {
              await supabase
                .from("innings")
                .update({
                  striker_id: innings.non_striker_id,
                  non_striker_id: innings.striker_id,
                })
                .eq("id", innings.id);
              load();
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3 w-3" /> Swap strike
          </button>
        )}

        {/* This over */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto rounded-xl border border-border bg-card/60 p-3">
          <span className="shrink-0 text-[11px] uppercase tracking-widest text-muted-foreground">
            Recent
          </span>
          {lastSix.length === 0 && (
            <span className="text-xs text-muted-foreground">No balls yet</span>
          )}
          {lastSix.map((b) => (
            <span
              key={b.id}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-sm ${
                b.is_wicket
                  ? "bg-destructive text-destructive-foreground"
                  : b.extra_type
                    ? "bg-accent/20 text-accent"
                    : b.runs >= 4
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
              }`}
            >
              {b.is_wicket
                ? "W"
                : b.extra_type === "wide"
                  ? `wd${b.runs > 1 ? b.runs : ""}`
                  : b.extra_type === "noball"
                    ? `nb${b.runs > 1 ? b.runs : ""}`
                    : b.extra_type === "bye"
                      ? `b${b.runs}`
                      : b.extra_type === "legbye"
                        ? `lb${b.runs}`
                        : b.runs}
            </span>
          ))}
        </div>

        {/* Extra toggles */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {(["wide", "noball", "bye", "legbye"] as ExtraKind[]).map((k) => {
            const active = extra === k;
            const labels: Record<ExtraKind, string> = {
              wide: "Wide",
              noball: "No-ball",
              bye: "Bye",
              legbye: "Leg-bye",
            };
            return (
              <button
                key={k}
                onClick={() => setExtra(active ? null : k)}
                disabled={busy}
                className={`h-12 rounded-lg border text-xs font-semibold uppercase tracking-wider transition ${
                  active
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[k]}
              </button>
            );
          })}
        </div>

        {/* Runs */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {runBtns.map((r) => (
            <button
              key={r}
              disabled={busy}
              onClick={() => addBall({ runs: r, extra_type: extra })}
              className="h-20 rounded-xl border border-border bg-card font-display text-4xl tracking-wide text-foreground transition active:scale-95 hover:border-primary/40 hover:bg-primary/10 disabled:opacity-60"
              style={{ minHeight: 56 }}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            onClick={() =>
              addBall({ runs: 0, extra_type: extra, is_wicket: true, wicket_type: "bowled" })
            }
            className="h-14 rounded-xl bg-destructive font-display text-2xl tracking-wide text-destructive-foreground transition active:scale-95 disabled:opacity-60"
            style={{ minHeight: 56 }}
          >
            WICKET
          </button>
          <button
            disabled={busy || balls.length === 0}
            onClick={undo}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card font-display text-xl tracking-wide text-foreground transition active:scale-95 disabled:opacity-50"
            style={{ minHeight: 56 }}
          >
            <Undo2 className="h-5 w-5" /> UNDO
          </button>
        </div>

        {/* Next batter prompt */}
        {!innings.striker_id && availableBatters.length > 0 && (
          <div className="mt-3 rounded-xl border border-accent/40 bg-accent/10 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
              New batter to crease
            </p>
            <div className="flex flex-wrap gap-2">
              {availableBatters.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPlayer("striker_id", m.id)}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/40"
                >
                  {m.player_name}
                  {m.jersey_number != null && (
                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                      #{m.jersey_number}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {extra && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <span className="font-semibold text-accent">{extra}</span> selected — tap a run button
            to log the delivery
          </p>
        )}

        {/* End match */}
        <div className="mt-6 border-t border-border pt-4">
          <button
            type="button"
            onClick={endMatch}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive transition active:scale-95 hover:bg-destructive/20 disabled:opacity-50"
          >
            <Flag className="h-4 w-4" /> End match
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Ends the match with the current score deciding the result.
          </p>
        </div>
      </main>
    </div>
  );
}

function PlayerSelect({
  label,
  value,
  members,
  onChange,
  stat,
  accent,
}: {
  label: string;
  value: string | null;
  members: Member[];
  onChange: (v: string | null) => void;
  stat?: string;
  accent?: boolean;
}) {
  return (
    <label className="block">
      <span
        className={`mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest ${
          accent ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <span>{label}</span>
        {stat && <span className="font-mono text-foreground">{stat}</span>}
      </span>
      <select
        className="input text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Select…</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.player_name}
            {m.jersey_number != null ? ` #${m.jersey_number}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
