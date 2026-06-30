import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, UserCheck, UserX } from "lucide-react";

interface Props {
  matchId: string;
  isPrimaryScorer: boolean; // true if current user is the original/active scorer
}

type SearchResult = { id: string; full_name: string | null; phone: string | null };

/**
 * Co-scorer assignment panel (shown to the primary scorer)
 * + heartbeat ping while this device is the active scorer.
 */
export function CoScorerPanel({ matchId, isPrimaryScorer }: Props) {
  const [coscorerName, setCoscorerName] = useState<string | null>(null);
  const [coscorerId, setCoscorerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Load current co-scorer
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("matches")
      .select("coscorer_user_id")
      .eq("id", matchId)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(async ({ data }: { data: any }) => {
        if (data?.coscorer_user_id) {
          setCoscorerId(data.coscorer_user_id);
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.coscorer_user_id)
            .maybeSingle();
          setCoscorerName((prof as { full_name?: string | null })?.full_name ?? "Unknown");
        }
      });
  }, [matchId]);

  // Heartbeat — ping every 60s while this device is the active scorer
  useEffect(() => {
    if (!isPrimaryScorer) return;
    const ping = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("matches")
        .update({ scorer_last_active: new Date().toISOString() })
        .eq("id", matchId)
        .eq("active_scorer_id", u.user.id);
    };
    ping();
    const interval = setInterval(ping, 60_000);
    return () => clearInterval(interval);
  }, [matchId, isPrimaryScorer]);

  const runSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(8);
    setResults((data as SearchResult[]) ?? []);
    setSearching(false);
  };

  const assign = async (userId: string, name: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("matches")
      .update({ coscorer_user_id: userId })
      .eq("id", matchId);
    if (error) { toast.error(error.message); return; }
    setCoscorerId(userId);
    setCoscorerName(name);
    setSearch("");
    setResults([]);
    toast.success(`${name} added as co-scorer`);
  };

  const remove = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("matches").update({ coscorer_user_id: null }).eq("id", matchId);
    setCoscorerId(null);
    setCoscorerName(null);
    toast.success("Co-scorer removed");
  };

  if (!isPrimaryScorer) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <UserCheck className="h-4 w-4 text-primary" /> Co-Scorer
      </div>

      {coscorerId ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
          <span className="text-sm font-medium">{coscorerName}</span>
          <button onClick={remove} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
            <UserX className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="input w-full pl-9 text-sm"
          />
          {results.length > 0 && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => assign(r.id, r.full_name ?? "Unknown")}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  <span className="font-medium">{r.full_name ?? "Unknown"}</span>
                  {r.phone && <span className="text-xs text-muted-foreground">{r.phone}</span>}
                </button>
              ))}
            </div>
          )}
          {searching && <p className="mt-1 text-xs text-muted-foreground">Searching…</p>}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Co-scorer can take over if you go offline for 2+ minutes.
      </p>
    </div>
  );
}