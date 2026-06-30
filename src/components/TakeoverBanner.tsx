import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Props {
  matchId: string;
  currentUserId: string | null;
}

const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Shown to the co-scorer. Polls scorer_last_active every 15s.
 * If the primary scorer has been silent for 2+ minutes,
 * shows a banner offering to take over scoring control.
 */
export function TakeoverBanner({ matchId, currentUserId }: Props) {
  const [isCoscorer, setIsCoscorer] = useState(false);
  const [offline, setOffline] = useState(false);
  const [takingOver, setTakingOver] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    const check = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("matches")
        .select("coscorer_user_id, active_scorer_id, scorer_last_active")
        .eq("id", matchId)
        .maybeSingle();
      if (!data) return;

      const amCoscorer = data.coscorer_user_id === currentUserId;
      setIsCoscorer(amCoscorer);
      if (!amCoscorer || data.active_scorer_id === currentUserId) {
        setOffline(false);
        return;
      }

      const lastActive = data.scorer_last_active ? new Date(data.scorer_last_active).getTime() : 0;
      setOffline(Date.now() - lastActive > OFFLINE_THRESHOLD_MS);
    };
    check();
    const interval = setInterval(check, 15_000);
    return () => clearInterval(interval);
  }, [matchId, currentUserId]);

  const takeOver = async () => {
    if (!currentUserId) return;
    setTakingOver(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("matches")
      .update({ active_scorer_id: currentUserId, scorer_last_active: new Date().toISOString() })
      .eq("id", matchId)
      .eq("coscorer_user_id", currentUserId);
    setTakingOver(false);
    if (error) { toast.error(error.message); return; }
    toast.success("You're now the active scorer");
    setOffline(false);
    // Reload so the score page re-fetches with new scoring rights
    window.location.reload();
  };

  if (!isCoscorer || !offline) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>Primary scorer is offline. Take over scoring?</span>
      </div>
      <button
        onClick={takeOver}
        disabled={takingOver}
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
      >
        {takingOver ? "…" : "Take Over"}
      </button>
    </div>
  );
}