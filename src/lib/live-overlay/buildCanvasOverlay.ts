// Bridges the live-scoring data (match/innings/balls/players) and the
// transient wicket/new-batter events into the shapes canvasOverlay.ts needs
// to bake a scorecard bar + popup directly into the outgoing broadcast
// frame. Mirrors the math in LiveScoreOverlayBar.tsx / useLiveOverlayEvents.ts
// on purpose, so the baked-in video overlay and the on-site HTML overlay
// never show different numbers.
import { batterFigures, bowlerFigures, currentRunRate, requiredRunRate, fmt1 } from "./liveStats";
import type { OverlayBall, OverlayInnings, OverlayMatch, OverlayMember } from "./types";
import type { CanvasOverlayBar, CanvasPopup } from "./canvasOverlay";
import type { WicketEvent, NewBatterEvent } from "@/components/live-overlay/useLiveOverlayEvents";

function name(m: OverlayMember | null | undefined, fallback = "—") {
  return m?.player_name ?? fallback;
}

export function buildCanvasOverlayBar(
  match: OverlayMatch,
  innings: OverlayInnings,
  balls: OverlayBall[],
  players: Record<string, OverlayMember>,
): CanvasOverlayBar {
  const battingTeam = match.team_a.id === innings.batting_team_id ? match.team_a : match.team_b;
  const bowlingTeam = match.team_a.id === innings.bowling_team_id ? match.team_a : match.team_b;

  const striker = innings.striker_id ? players[innings.striker_id] : null;
  const nonStriker = innings.non_striker_id ? players[innings.non_striker_id] : null;
  const bowler = innings.bowler_id ? players[innings.bowler_id] : null;

  const strikerStat = batterFigures(balls, innings.striker_id);
  const nonStrikerStat = batterFigures(balls, innings.non_striker_id);
  const bowlerStat = bowlerFigures(balls, innings.bowler_id);

  const oversStr = `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`;
  const crr = currentRunRate(innings.runs, innings.balls);
  const rrr = requiredRunRate(innings.target, innings.runs, match.overs, innings.balls);

  return {
    battingShort: battingTeam.short_name || battingTeam.name,
    battingColor: battingTeam.jersey_color || "#003527",
    runs: innings.runs,
    wickets: innings.wickets,
    oversStr,
    crr: fmt1(crr),
    rrr: rrr != null ? fmt1(rrr) : null,
    targetLine:
      innings.target != null
        ? `Need ${Math.max(0, innings.target - innings.runs)} runs from ${Math.max(0, match.overs * 6 - innings.balls)} balls`
        : null,
    strikerName: name(striker),
    strikerRuns: strikerStat.runs,
    strikerBalls: strikerStat.balls,
    nonStrikerName: name(nonStriker),
    nonStrikerRuns: nonStrikerStat.runs,
    nonStrikerBalls: nonStrikerStat.balls,
    bowlerName: name(bowler),
    bowlerFigures: `${bowlerStat.oversStr}-${bowlerStat.runs}-${bowlerStat.wkts} vs ${bowlingTeam.short_name || bowlingTeam.name}`,
  };
}

export function buildCanvasPopup(
  wicketEvent: WicketEvent | null,
  newBatterEvent: NewBatterEvent | null,
): CanvasPopup {
  if (wicketEvent) {
    const bowlerBit = wicketEvent.bowler ? ` · b ${wicketEvent.bowler.player_name}` : "";
    return {
      kind: "wicket",
      name: wicketEvent.dismissedPlayer?.player_name ?? "Batter",
      runs: wicketEvent.runs,
      balls: wicketEvent.balls,
      detail: `${wicketEvent.wicketTypeLabel}${bowlerBit} · over ${wicketEvent.overAt}`,
    };
  }
  if (newBatterEvent) {
    return {
      kind: "new_batter",
      name: newBatterEvent.player?.player_name ?? "New Batter",
      jersey: newBatterEvent.player?.jersey_number != null ? String(newBatterEvent.player.jersey_number) : null,
    };
  }
  return null;
}