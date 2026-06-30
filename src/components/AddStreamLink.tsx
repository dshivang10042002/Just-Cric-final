import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl } from "@/utils/getYouTubeEmbedUrl";
import { Link2, Radio, Square, Trash2 } from "lucide-react";

type StreamStatus = "idle" | "live" | "ended";

interface Props {
  matchId: string;
}

export function AddStreamLink({ matchId }: Props) {
  const [url, setUrl]           = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [status, setStatus]     = useState<StreamStatus>("idle");
  const [saving, setSaving]     = useState(false);

  // Load current stream state on mount
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("matches")
      .select("stream_url, stream_status")
      .eq("id", matchId)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        if (data?.stream_url) setUrl(data.stream_url);
        if (data?.stream_status) setStatus(data.stream_status as StreamStatus);
      });
  }, [matchId]);

  const goLive = async () => {
    setUrlError(null);
    const embed = getYouTubeEmbedUrl(url);
    if (!embed) {
      setUrlError("Please enter a valid YouTube URL");
      return;
    }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("matches")
      .update({
        stream_url: url.trim(),
        stream_status: "live",
        stream_added_at: new Date().toISOString(),
      })
      .eq("id", matchId);
    setSaving(false);
    if (error) { setUrlError(error.message); return; }
    setStatus("live");
  };

  const endStream = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("matches")
      .update({ stream_status: "ended" })
      .eq("id", matchId);
    setSaving(false);
    setStatus("ended");
  };

  const removeLink = async () => {
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("matches")
      .update({ stream_url: null, stream_status: "idle", stream_added_at: null })
      .eq("id", matchId);
    setSaving(false);
    setUrl("");
    setStatus("idle");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>🎥</span> Link YouTube Stream
      </div>

      {/* ── IDLE: show input ── */}
      {status === "idle" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(null); }}
                placeholder="Paste your YouTube Live URL"
                className="input w-full pl-9 font-mono text-xs"
              />
            </div>
            <button
              onClick={goLive}
              disabled={saving || !url.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              {saving ? "Linking…" : "Go Live 🔴"}
            </button>
          </div>
          {urlError && (
            <p className="text-xs text-destructive">{urlError}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Start your stream on YouTube first, then paste the URL here.
          </p>
        </div>
      )}

      {/* ── LIVE: stream active ── */}
      {status === "live" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive font-semibold">
            <Radio className="h-4 w-4 animate-pulse" />
            ✅ Stream linked! Viewers can see it.
          </div>
          {url && (
            <p className="truncate font-mono text-[10px] text-muted-foreground">{url}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={endStream}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              {saving ? "Ending…" : "End Stream"}
            </button>
            <button
              onClick={removeLink}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove Link
            </button>
          </div>
        </div>
      )}

      {/* ── ENDED: replay saved ── */}
      {status === "ended" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground">
            ▶ Stream ended. Replay saved on your YouTube channel.
          </div>
          <button
            onClick={removeLink}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:bg-secondary disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {saving ? "Removing…" : "Remove Link"}
          </button>
        </div>
      )}
    </div>
  );
}