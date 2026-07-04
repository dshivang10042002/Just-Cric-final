import { useMemo } from "react";
import {
  batterFigures, bowlerFigures, currentRunRate, requiredRunRate, fmt1,
} from "@/lib/live-overlay/liveStats";
import type { OverlayBall, OverlayInnings, OverlayMatch, OverlayMember } from "@/lib/live-overlay/types";

interface Props {
  match: OverlayMatch;
  innings: OverlayInnings;
  balls: OverlayBall[]; // balls for the CURRENT innings only
  players: Record<string, OverlayMember>;
}

function name(m: OverlayMember | null | undefined, fallback = "—") {
  return m?.player_name ?? fallback;
}

/**
 * Persistent bottom-of-screen scorecard bar — team score, striker/non-striker
 * with runs & balls, bowler figures, current & required run rate. Designed
 * to sit as an absolutely-positioned overlay on top of the video player.
 */
export function LiveScoreOverlayBar({ match, innings, balls, players }: Props) {
  const battingTeam = match.team_a.id === innings.batting_team_id ? match.team_a : match.team_b;
  const bowlingTeam = match.team_a.id === innings.bowling_team_id ? match.team_a : match.team_b;

  const striker = innings.striker_id ? players[innings.striker_id] : null;
  const nonStriker = innings.non_striker_id ? players[innings.non_striker_id] : null;
  const bowler = innings.bowler_id ? players[innings.bowler_id] : null;

  const strikerStat = useMemo(() => batterFigures(balls, innings.striker_id), [balls, innings.striker_id]);
  const nonStrikerStat = useMemo(() => batterFigures(balls, innings.non_striker_id), [balls, innings.non_striker_id]);
  const bowlerStat = useMemo(() => bowlerFigures(balls, innings.bowler_id), [balls, innings.bowler_id]);

  const oversStr = `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`;
  const crr = currentRunRate(innings.runs, innings.balls);
  const rrr = requiredRunRate(innings.target, innings.runs, match.overs, innings.balls);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 select-none px-1.5 pb-1.5 sm:px-3 sm:pb-3">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-black/80 shadow-2xl backdrop-blur-sm">
        {/* Score strip */}
        <div className="flex items-center gap-2 border-b border-white/10 bg-gradient-to-r from-emerald-900/90 to-black/70 px-2.5 py-1.5 sm:px-4 sm:py-2">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white sm:h-7 sm:w-7 sm:text-[10px]"
            style={{ background: battingTeam.jersey_color || "#003527" }}
          >
            {(battingTeam.short_name || battingTeam.name).slice(0, 3).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-bold text-white sm:text-sm">
              {battingTeam.short_name || battingTeam.name}
              <span className="ml-1.5 font-mono tabular-nums text-amber-300">
                {innings.runs}-{innings.wickets}
              </span>
              <span className="ml-1 text-[10px] font-normal text-white/60">({oversStr} ov)</span>
            </div>
          </div>
          <div className="shrink-0 text-right text-[10px] leading-tight text-white/70 sm:text-[11px]">
            <div>CRR <span className="font-mono text-white">{fmt1(crr)}</span></div>
            {rrr != null && <div>RRR <span className="font-mono text-amber-300">{fmt1(rrr)}</span></div>}
          </div>
        </div>

        {/* Target line, when chasing */}
        {innings.target != null && (
          <div className="border-b border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-amber-200 sm:px-4">
            Need {Math.max(0, innings.target - innings.runs)} runs from{" "}
            {Math.max(0, match.overs * 6 - innings.balls)} balls
          </div>
        )}

        {/* Batters + bowler row */}
        <div className="grid grid-cols-2 gap-2 px-2.5 py-1.5 text-white sm:gap-4 sm:px-4 sm:py-2">
          <div className="min-w-0 space-y-0.5">
            <PlayerLine label="✦" pname={name(striker)} runs={strikerStat.runs} balls={strikerStat.balls} highlight />
            <PlayerLine pname={name(nonStriker)} runs={nonStrikerStat.runs} balls={nonStrikerStat.balls} />
          </div>
          <div className="min-w-0 text-right">
            <div className="truncate text-[11px] font-semibold sm:text-xs">{name(bowler)}</div>
            <div className="text-[10px] text-white/60 sm:text-[11px]">
              <span className="font-mono">{bowlerStat.oversStr}-{bowlerStat.runs}-{bowlerStat.wkts}</span>
              <span className="ml-1.5">vs {bowlingTeam.short_name || bowlingTeam.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerLine({
  pname, runs, balls, label, highlight,
}: { pname: string; runs: number; balls: number; label?: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-1 truncate text-[11px] sm:text-xs ${highlight ? "font-bold text-white" : "text-white/70"}`}>
      {label && <span className="text-amber-300">{label}</span>}
      <span className="truncate">{pname}</span>
      <span className="ml-auto font-mono tabular-nums text-white/80">{runs}<span className="text-white/40">({balls})</span></span>
    </div>
  );
}
