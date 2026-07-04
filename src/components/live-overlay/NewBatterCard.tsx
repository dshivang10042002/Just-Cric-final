import { PlayerAvatarChip, RoleBadge } from "@/components/PlayerAvatarChip";
import type { NewBatterEvent } from "./useLiveOverlayEvents";

interface Props {
  event: NewBatterEvent;
  onClose: () => void;
}

/** "New batter in" card — photo, name, jersey number, role. */
export function NewBatterCard({ event, onClose }: Props) {
  const pname = event.player?.player_name ?? "New Batter";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3 sm:top-6">
      <div className="animate-in fade-in slide-in-from-top-4 pointer-events-auto w-full max-w-xs overflow-hidden rounded-xl border border-emerald-500/40 bg-black/90 shadow-2xl duration-300 sm:max-w-sm">
        <div className="flex items-center justify-between bg-emerald-700 px-3 py-1">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">🏏 New Batter</span>
          <button onClick={onClose} className="text-white/80 hover:text-white" aria-label="Dismiss">
            ✕
          </button>
        </div>
        <div className="flex items-center gap-3 p-3">
          <PlayerAvatarChip name={pname} avatarUrl={event.player?.avatar_url ?? null} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-white">{pname}</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {event.player?.jersey_number != null && (
                <span className="font-mono text-xs text-white/60">#{event.player.jersey_number}</span>
              )}
              <RoleBadge role={event.player?.role ?? null} />
            </div>
            <div className="mt-1 text-[11px] text-white/60">In to bat</div>
          </div>
        </div>
      </div>
    </div>
  );
}
