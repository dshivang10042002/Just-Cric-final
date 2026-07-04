import { useEffect, useRef, useState } from "react";
import { batterFigures, wicketLabel } from "@/lib/live-overlay/liveStats";
import type { OverlayBall, OverlayInnings, OverlayMember } from "@/lib/live-overlay/types";

export type WicketEvent = {
  key: string;
  dismissedPlayer: OverlayMember | null;
  bowler: OverlayMember | null;
  wicketTypeLabel: string;
  runs: number;
  balls: number;
  overAt: string; // "12.4"
};

export type NewBatterEvent = {
  key: string;
  player: OverlayMember | null;
};

const WICKET_VISIBLE_MS = 8000;
const NEW_BATTER_VISIBLE_MS = 6000;

/**
 * Watches the live `balls` feed for an innings and raises transient
 * "wicket fell" / "new batter in" events, each auto-dismissed after a
 * few seconds — mirroring what a broadcast graphics package does.
 */
export function useLiveOverlayEvents(
  innings: OverlayInnings | null | undefined,
  balls: OverlayBall[],
  players: Record<string, OverlayMember>,
) {
  const [wicketEvent, setWicketEvent] = useState<WicketEvent | null>(null);
  const [newBatterEvent, setNewBatterEvent] = useState<NewBatterEvent | null>(null);

  const seenWicketBallRef = useRef<string | null>(null);
  const prevPairRef = useRef<{ inningsId: string | null; striker: string | null; nonStriker: string | null }>({
    inningsId: null, striker: null, nonStriker: null,
  });
  const seenBattersRef = useRef<Set<string>>(new Set());
  const wicketTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset tracking whenever the innings changes.
  useEffect(() => {
    seenWicketBallRef.current = null;
    seenBattersRef.current = new Set();
    prevPairRef.current = { inningsId: innings?.id ?? null, striker: null, nonStriker: null };
  }, [innings?.id]);

  // ── Wicket popup ──
  useEffect(() => {
    if (!innings || balls.length === 0) return;
    const inningsBalls = balls.filter((b) => (b as OverlayBall & { innings_id?: string }).innings_id
      ? (b as unknown as { innings_id: string }).innings_id === innings.id
      : true);
    const latestWicket = [...inningsBalls].sort((a, b) => b.ball_index - a.ball_index).find((b) => b.is_wicket);
    if (!latestWicket) return;
    const key = `${innings.id}:${latestWicket.ball_index}`;
    if (seenWicketBallRef.current === key) return;
    seenWicketBallRef.current = key;

    const dismissedId = latestWicket.dismissed_player_id;
    const stat = batterFigures(inningsBalls, dismissedId, latestWicket.ball_index);
    const overAt = `${Math.floor(latestWicket.ball_index / 6)}.${latestWicket.ball_index % 6}`;

    setWicketEvent({
      key,
      dismissedPlayer: dismissedId ? players[dismissedId] ?? null : null,
      bowler: latestWicket.bowler_id ? players[latestWicket.bowler_id] ?? null : null,
      wicketTypeLabel: wicketLabel(latestWicket.wicket_type),
      runs: stat.runs,
      balls: stat.balls,
      overAt,
    });

    if (wicketTimerRef.current) clearTimeout(wicketTimerRef.current);
    wicketTimerRef.current = setTimeout(() => setWicketEvent(null), WICKET_VISIBLE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innings?.id, balls, players]);

  // ── New batter popup ──
  useEffect(() => {
    if (!innings) return;
    const prev = prevPairRef.current;
    const isFirstReadForInnings = prev.inningsId !== innings.id || (prev.striker === null && prev.nonStriker === null && seenBattersRef.current.size === 0);

    const currentPair = [innings.striker_id, innings.non_striker_id].filter(Boolean) as string[];

    if (!isFirstReadForInnings) {
      for (const id of currentPair) {
        if (!seenBattersRef.current.has(id)) {
          seenBattersRef.current.add(id);
          const key = `${innings.id}:${id}`;
          setNewBatterEvent({ key, player: players[id] ?? null });
          if (batterTimerRef.current) clearTimeout(batterTimerRef.current);
          batterTimerRef.current = setTimeout(() => setNewBatterEvent(null), NEW_BATTER_VISIBLE_MS);
          break; // show one at a time even if both slots changed at once
        }
      }
    } else {
      // Baseline pass: remember the opening pair without popping a card.
      currentPair.forEach((id) => seenBattersRef.current.add(id));
    }

    prevPairRef.current = { inningsId: innings.id, striker: innings.striker_id, nonStriker: innings.non_striker_id };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [innings?.id, innings?.striker_id, innings?.non_striker_id, players]);

  useEffect(() => {
    return () => {
      if (wicketTimerRef.current) clearTimeout(wicketTimerRef.current);
      if (batterTimerRef.current) clearTimeout(batterTimerRef.current);
    };
  }, []);

  return {
    wicketEvent,
    newBatterEvent,
    dismissWicket: () => setWicketEvent(null),
    dismissNewBatter: () => setNewBatterEvent(null),
  };
}
