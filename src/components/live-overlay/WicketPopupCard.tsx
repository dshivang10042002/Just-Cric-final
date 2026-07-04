import { PlayerAvatarChip } from "@/components/PlayerAvatarChip";
import type { WicketEvent } from "./useLiveOverlayEvents";

interface Props {
  event: WicketEvent;
  onClose: () => void;
}

/** CricHeroes/broadcast-style "WICKET" card — dismissed batter's photo, final score, and how out. */
export function WicketPopupCard({ event, onClose }: Props) {
  const pname = event.dismissedPlayer?.player_name ?? "Batter";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3 sm:top-6">
      <div className="animate-in fade-in slide-in-from-top-4 pointer-events-auto w-full max-w-xs overflow-hidden rounded-xl border border-red-500/40 bg-black/90 shadow-2xl duration-300 sm:max-w-sm">
        <div className="flex items-center justify-between bg-red-600 px-3 py-1">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">🎯 Wicket!</span>
          <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Dismiss">
            ✕
          </button>
        </div>
        <div className="flex items-center gap-3 p-3">
          <PlayerAvatarChip name={pname} avatarUrl={event.dismissedPlayer?.avatar_url ?? null} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-white">{pname}</div>
            <div className="font-mono text-sm text-amber-300">
              {event.runs} <span className="text-white/50">({event.balls})</span>
            </div>
            <div className="mt-0.5 text-[11px] text-white/60">
              {event.wicketTypeLabel}
              {event.bowler ? ` · b ${event.bowler.player_name}` : ""} · over {event.overAt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
