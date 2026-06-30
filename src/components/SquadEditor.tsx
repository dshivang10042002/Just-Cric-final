import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlayerAvatarChip, RoleBadge } from "@/components/PlayerAvatarChip";
import { Check, Search, X } from "lucide-react";

type Member = { id: string; player_name: string; role: string | null; avatar_url: string | null };
type Selection = { playerId: string; isCaptain: boolean; isWk: boolean };

interface Props {
  matchId: string;
  teamId: string;
  teamName: string;
  allMembers: Member[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Squad / Playing XI editor for one team.
 * Used both pre-match (mandatory-skippable step) and mid-match
 * (via an "Edit Squad" button) to add/remove/swap players.
 */
export function SquadEditor({ matchId, teamId, teamName, allMembers, onClose, onSaved }: Props) {
  const [selected, setSelected] = useState<Map<string, Selection>>(new Map());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Load existing match_players for this team/match
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("match_players")
      .select("player_id, is_captain, is_wicketkeeper")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] | null }) => {
        const map = new Map<string, Selection>();
        (data ?? []).forEach((r) => {
          map.set(r.player_id, { playerId: r.player_id, isCaptain: r.is_captain, isWk: r.is_wicketkeeper });
        });
        setSelected(map);
      });
  }, [matchId, teamId]);

  const filtered = allMembers.filter((m) =>
    m.player_name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 11) {
          toast.error("Maximum 11 players allowed");
          return prev;
        }
        next.set(id, { playerId: id, isCaptain: false, isWk: false });
      }
      return next;
    });
  };

  const setCaptain = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.forEach((v, k) => next.set(k, { ...v, isCaptain: k === id }));
      return next;
    });
  };

  const setWk = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.forEach((v, k) => next.set(k, { ...v, isWk: k === id }));
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    // Remove existing rows for this team/match, then re-insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("match_players").delete().eq("match_id", matchId).eq("team_id", teamId);

    if (selected.size > 0) {
      const rows = [...selected.values()].map((s) => ({
        match_id: matchId, player_id: s.playerId, team_id: teamId,
        is_playing: true, is_captain: s.isCaptain, is_wicketkeeper: s.isWk,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("match_players").insert(rows);
      if (error) {
        setSaving(false);
        toast.error(error.message);
        return;
      }
    }
    setSaving(false);
    toast.success(`${teamName} squad saved`);
    onSaved();
    onClose();
  };

  const selectedMembers = [...selected.keys()]
    .map((id) => allMembers.find((m) => m.id === id))
    .filter(Boolean) as Member[];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">

        {/* Drag handle */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-display text-lg">{teamName} Squad</div>
            <div className="text-xs text-muted-foreground">{selected.size} / 11 selected</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Captain / WK selectors — shown once players are selected */}
        {selected.size > 0 && (
          <div className="grid grid-cols-2 gap-2 border-b border-border px-5 py-3">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Captain</label>
              <select
                className="input mt-1 w-full text-xs"
                value={[...selected.values()].find((s) => s.isCaptain)?.playerId ?? ""}
                onChange={(e) => setCaptain(e.target.value)}
              >
                <option value="">—</option>
                {selectedMembers.map((m) => <option key={m.id} value={m.id}>{m.player_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Wicketkeeper</label>
              <select
                className="input mt-1 w-full text-xs"
                value={[...selected.values()].find((s) => s.isWk)?.playerId ?? ""}
                onChange={(e) => setWk(e.target.value)}
              >
                <option value="">—</option>
                {selectedMembers.map((m) => <option key={m.id} value={m.id}>{m.player_name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="border-b border-border px-5 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players…"
              className="input w-full pl-8 text-sm"
            />
          </div>
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No players found.</p>
          ) : filtered.map((m) => {
            const isSelected = selected.has(m.id);
            const sel = selected.get(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                  isSelected ? "border-primary/40 bg-primary/10" : "border-border bg-background hover:border-primary/20"
                }`}
              >
                <PlayerAvatarChip name={m.player_name} avatarUrl={m.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{m.player_name}</div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <RoleBadge role={m.role} />
                    {sel?.isCaptain && <span className="text-[9px] font-bold text-primary">C</span>}
                    {sel?.isWk && <span className="text-[9px] font-bold text-amber-500">WK</span>}
                  </div>
                </div>
                <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                  isSelected ? "border-primary bg-primary" : "border-border"
                }`}>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save Squad (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}