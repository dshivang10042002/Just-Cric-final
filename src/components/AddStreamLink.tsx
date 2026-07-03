import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl } from "@/utils/getYouTubeEmbedUrl";
import { Link2, Radio, Square, Trash2, Copy, Check } from "lucide-react";
import { startYouTubeLive, stopYouTubeLive } from "@/lib/api/youtube-live.functions";

type StreamStatus = "idle" | "live" | "ended";

interface Props {
  matchId: string;
}

function CopyField({ label, value, mask }: { label: string; value: string; mask?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          readOnly
          type={mask ? "password" : "text"}
          value={value}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="input flex-1 font-mono text-xs"
        />
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold transition hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function AddStreamLink({ matchId }: Props) {
  const [url, setUrl]           = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [status, setStatus]     = useState<StreamStatus>("idle");
  const [saving, setSaving]     = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [liveInfo, setLiveInfo] = useState<{ rtmpUrl: string; streamKey: string; watchUrl: string; title: string } | null>(null);

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

  // ── Automated: JustCric creates the YouTube broadcast for you ──
  const goLiveAuto = async () => {
    setAutoError(null);
    setSaving(true);
    try {
      const result = await startYouTubeLive({ data: { matchId } });
      setLiveInfo(result);
      setUrl(result.watchUrl);
      setStatus("live");
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : "Couldn't start the YouTube broadcast");
    } finally {
      setSaving(false);
    }
  };

  const endStreamAuto = async () => {
    setSaving(true);
    try {
      await stopYouTubeLive({ data: { matchId } });
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : "Couldn't end the broadcast cleanly — check your YouTube Studio");
    } finally {
      setSaving(false);
      setStatus("ended");
      setLiveInfo(null);
    }
  };

  // ── Manual fallback: paste a link you already started elsewhere ──
  const goLiveManual = async () => {
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
    if (liveInfo) return endStreamAuto();
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
    setLiveInfo(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>🎥</span> Live Stream
      </div>

      {/* ── IDLE ── */}
      {status === "idle" && !manualMode && (
        <div className="space-y-2">
          <button
            onClick={goLiveAuto}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            <Radio className="h-4 w-4 animate-pulse" />
            {saving ? "Starting broadcast…" : "Go Live 🔴"}
          </button>
          {autoError && (
            <p className="text-xs text-destructive">{autoError}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Creates a broadcast on your YouTube channel, titled "Team vs Team — Venue." You'll get an RTMP URL + key to plug into your streaming app (OBS, Larix, Streamlabs, etc.) — the recording auto-saves to your channel under that same title when the match ends.
          </p>
          <button
            onClick={() => setManualMode(true)}
            className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
          >
            Already streaming? Paste an existing link instead
          </button>
        </div>
      )}

      {status === "idle" && manualMode && (
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
              onClick={goLiveManual}
              disabled={saving || !url.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              {saving ? "Linking…" : "Go Live 🔴"}
            </button>
          </div>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          <button
            onClick={() => setManualMode(false)}
            className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
          >
            ← Back to automatic Go Live
          </button>
        </div>
      )}

      {/* ── LIVE ── */}
      {status === "live" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive font-semibold">
            <Radio className="h-4 w-4 animate-pulse" />
            {liveInfo ? `Broadcast created: "${liveInfo.title}"` : "Stream linked! Viewers can see it."}
          </div>

          {liveInfo && (
            <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
              <CopyField label="RTMP Server URL" value={liveInfo.rtmpUrl} />
              <CopyField label="Stream Key" value={liveInfo.streamKey} mask />
              <p className="text-[11px] text-muted-foreground">
                Paste these into your streaming app to start sending video — once it connects, you'll go live on YouTube automatically.
              </p>
            </div>
          )}

          {url && !liveInfo && (
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

      {/* ── ENDED ── */}
      {status === "ended" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground">
            ▶ Stream ended. Recording saves to your YouTube channel automatically.
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