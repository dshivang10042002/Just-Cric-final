// Shared, dependency-free stat math for the live-broadcast overlay system.
// Used by both the HTML overlay (LiveScoreOverlayBar / popup cards) and the
// canvas compositor that bakes the same numbers into the outgoing video
// (src/lib/live-overlay/canvasOverlay.ts) — so the two never drift apart.

export type OverlayBall = {
  ball_index: number;
  runs: number;
  extra_type: "wide" | "noball" | "bye" | "legbye" | null;
  is_wicket: boolean;
  wicket_type: string | null;
  batter_id: string | null;
  bowler_id: string | null;
  dismissed_player_id: string | null;
};

export type BatterFigures = { runs: number; balls: number; fours: number; sixes: number };
export type BowlerFigures = { legalBalls: number; runs: number; wkts: number; oversStr: string; economy: number | null };

const RUNOUT_LIKE = new Set(["runout", "retired_hurt"]);

/** Runs/balls/4s/6s for one batter, optionally capped at a ball_index (inclusive) for "figures at time of dismissal". */
export function batterFigures(balls: OverlayBall[], playerId: string | null, uptoBallIndex?: number): BatterFigures {
  const out: BatterFigures = { runs: 0, balls: 0, fours: 0, sixes: 0 };
  if (!playerId) return out;
  for (const b of balls) {
    if (b.batter_id !== playerId) continue;
    if (uptoBallIndex != null && b.ball_index > uptoBallIndex) continue;
    if (b.extra_type !== "wide") out.balls += 1;
    const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
    if (isBatRun) {
      const r = b.extra_type === "noball" ? Math.max(0, b.runs - 1) : b.runs;
      out.runs += r;
      if (r === 4) out.fours += 1;
      if (r === 6) out.sixes += 1;
    }
  }
  return out;
}

/** Overs-runs-wickets figures for one bowler across an innings. */
export function bowlerFigures(balls: OverlayBall[], playerId: string | null): BowlerFigures {
  const empty: BowlerFigures = { legalBalls: 0, runs: 0, wkts: 0, oversStr: "0.0", economy: null };
  if (!playerId) return empty;
  let legalBalls = 0, runs = 0, wkts = 0;
  for (const b of balls) {
    if (b.bowler_id !== playerId) continue;
    if (b.extra_type !== "wide" && b.extra_type !== "noball") legalBalls += 1;
    runs += b.runs;
    if (b.is_wicket && b.wicket_type && !RUNOUT_LIKE.has(b.wicket_type)) wkts += 1;
  }
  const oversStr = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  const economy = legalBalls > 0 ? (runs / legalBalls) * 6 : null;
  return { legalBalls, runs, wkts, oversStr, economy };
}

export function formatOvers(legalBalls: number) {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export function currentRunRate(runs: number, legalBalls: number): number | null {
  if (legalBalls <= 0) return null;
  return (runs / legalBalls) * 6;
}

export function requiredRunRate(target: number | null, runs: number, totalOvers: number, legalBalls: number): number | null {
  if (!target) return null;
  const ballsLeft = totalOvers * 6 - legalBalls;
  if (ballsLeft <= 0) return null;
  return ((target - runs) / ballsLeft) * 6;
}

export function fmt1(n: number | null): string {
  return n == null ? "—" : n.toFixed(2);
}

const WICKET_LABELS: Record<string, string> = {
  bowled: "Bowled", lbw: "LBW", caught: "Caught", caught_behind: "Caught Behind",
  runout: "Run Out", stumped: "Stumped", hit_wicket: "Hit Wicket", retired_hurt: "Retired Hurt",
};

export function wicketLabel(type: string | null): string {
  return type ? (WICKET_LABELS[type] ?? type) : "Out";
}
