import { useMemo } from "react";
import { LiveScoreOverlayBar } from "./LiveScoreOverlayBar";
import { WicketPopupCard } from "./WicketPopupCard";
import { NewBatterCard } from "./NewBatterCard";
import { useLiveOverlayEvents } from "./useLiveOverlayEvents";
import type { OverlayBall, OverlayInnings, OverlayMatch, OverlayMember } from "@/lib/live-overlay/types";

interface Props {
  match: OverlayMatch;
  innings: OverlayInnings | null | undefined;
  /** All balls for the match (any shape with innings_id, or already filtered to the current innings). */
  balls: (OverlayBall & { innings_id?: string })[];
  players: Record<string, OverlayMember>;
}

/**
 * Drop this inside a `position: relative` wrapper around the video player
 * (see VideoStreamEmbed usage in match.$matchId.tsx) to get a CricHeroes/
 * Hotstar-style scorecard bar plus wicket & new-batter pop-ups, driven by
 * the same realtime data that powers the scorecard tabs.
 */
export function LiveBroadcastOverlay({ match, innings, balls, players }: Props) {
  const inningsBalls = useMemo(
    () => (innings ? balls.filter((b) => (b.innings_id ? b.innings_id === innings.id : true)) : []),
    [balls, innings],
  );

  const { wicketEvent, newBatterEvent, dismissWicket, dismissNewBatter } = useLiveOverlayEvents(innings, inningsBalls, players);

  if (!innings) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <LiveScoreOverlayBar match={match} innings={innings} balls={inningsBalls} players={players} />
      {wicketEvent && <WicketPopupCard event={wicketEvent} onClose={dismissWicket} />}
      {!wicketEvent && newBatterEvent && <NewBatterCard event={newBatterEvent} onClose={dismissNewBatter} />}
    </div>
  );
}
