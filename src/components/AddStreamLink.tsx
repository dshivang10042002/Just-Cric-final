import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl } from "@/utils/getYouTubeEmbedUrl";
import { Link2, Radio, Square, Trash2, Copy, Check, Video } from "lucide-react";
import { startYouTubeLive, stopYouTubeLive } from "@/lib/api/youtube-live.functions";
import { VideoStreamEmbed } from "@/components/VideoStreamEmbed";
import { useBrowserBroadcast } from "@/hooks/useBrowserBroadcast";
import { useLiveOverlayEvents } from "@/components/live-overlay/useLiveOverlayEvents";
import { buildCanvasOverlayBar, buildCanvasPopup } from "@/lib/live-overlay/buildCanvasOverlay";
import type { CanvasOverlayBar, CanvasPopup } from "@/lib/live-overlay/canvasOverlay";
import type { OverlayBall, OverlayInnings, OverlayMatch, OverlayMember } from "@/lib/live-overlay/types";

type StreamStatus = "idle" | "live" | "ended";
type GoLiveMode = "device" | "advanced" | "manual" | null;

interface Props {
  matchId: string;
  /** Live match context, used to bake the scorecard bar/popups onto the
   *  outgoing video when streaming straight from this device's camera. */
  match?: OverlayMatch | null;
  innings?: OverlayInnings | null;
  balls?: OverlayBall[];
  players?: Record<string, OverlayMember>;
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

/** Live preview of the camera feed being sent — bound directly to the MediaStream, no extra getUserMedia call. */
function CameraPreview({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="aspect-video w-full rounded-lg border border-border bg-black object-cover"
    />
  );
}

export function AddStreamLink({ matchId, match, innings, balls, players }: Props) {
  const [url, setUrl]           = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [status, setStatus]     = useState<StreamStatus>("idle");
  const [saving, setSaving]     = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<GoLiveMode>(null);
  const [liveInfo, setLiveInfo] = useState<{ rtmpUrl: string; streamKey: string; watchUrl: string; title: string } | null>(null);

  const browserBroadcast = useBrowserBroadcast();

  // ── Keep the scorecard bar/popup fed to the canvas compositor fresh every
  //    frame, without recreating the getOverlay callback (and therefore the
  //    whole broadcast) every time the score changes. ──
  const { wicketEvent, newBatterEvent } = useLiveOverlayEvents(innings ?? null, balls ?? [], players ?? {});
  const overlayDataRef = useRef<{ bar: CanvasOverlayBar | null; popup: CanvasPopup }>({ bar: null, popup: null });
  useEffect(() => {
    overlayDataRef.current = {
      bar: match && innings ? buildCanvasOverlayBar(match, innings, balls ?? [], players ?? {}) : null,
      popup: buildCanvasPopup(wicketEvent, newBatterEvent),
    };
  }, [match, innings, balls, players, wicketEvent, newBatterEvent]);
  const getOverlay = useCallback(() => overlayDataRef.current, []);

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

  // ── One-click: stream this device's camera (scorecard baked in) straight
  //    to YouTube via the ingest relay — no OBS required. ──
  const goLiveFromDevice = async () => {
    setAutoError(null);
    if (!import.meta.env.VITE_INGEST_WS_URL) {
      setAutoError(
        "Device streaming isn't set up on this deployment yet (the ingest relay isn't configured). Use \"Advanced: OBS / Streamlabs\" below instead.",
      );
      return;
    }
    setSaving(true);
    try {
      const result = await startYouTubeLive({ data: { matchId } });
      setLiveInfo(result);
      setUrl(result.watchUrl);
      setActiveMode("device");
      setStatus("live");
      await browserBroadcast.start({
        rtmpUrl: result.rtmpUrl,
        streamKey: result.streamKey,
        getOverlay,
      });
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : "Couldn't start the broadcast");
    } finally {
      setSaving(false);
    }
  };

  // ── Advanced: creates the YouTube broadcast; hands back RTMP URL + Stream
  //    Key for whatever streaming app the scorer uses (OBS/Streamlabs/Larix). ──
  const goLive = async () => {
    setAutoError(null);
    setSaving(true);
    try {
      const result = await startYouTubeLive({ data: { matchId } });
      setLiveInfo(result);
      setUrl(result.watchUrl);
      setActiveMode("advanced");
      setStatus("live");
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : "Couldn't start the broadcast");
    } finally {
      setSaving(false);
    }
  };

  const endStreamAuto = async () => {
    setSaving(true);
    browserBroadcast.stop();
    try {
      await stopYouTubeLive({ data: { matchId } });
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : "Couldn't end the broadcast cleanly — check your YouTube Studio");
    } finally {
      setSaving(false);
      setStatus("ended");
      setLiveInfo(null);
      setActiveMode(null);
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
    setActiveMode("manual");
    setStatus("live");
  };

  const endStream = async () => {
    if (liveInfo) return endStreamAuto();
    browserBroadcast.stop();
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("matches")
      .update({ stream_status: "ended" })
      .eq("id", matchId);
    setSaving(false);
    setStatus("ended");
    setActiveMode(null);
  };

  const removeLink = async () => {
    setSaving(true);
    browserBroadcast.stop();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("matches")
      .update({ stream_url: null, stream_status: "idle", stream_added_at: null })
      .eq("id", matchId);
    setSaving(false);
    setUrl("");
    setStatus("idle");
    setLiveInfo(null);
    setActiveMode(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>🎥</span> Go Live
      </div>

      {/* ── IDLE: pick a mode ── */}
      {status === "idle" && !manualMode && !advancedMode && (
        <div className="space-y-2">
          <button
            onClick={goLiveFromDevice}
            disabled={saving || browserBroadcast.state === "starting"}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            <Video className="h-4 w-4" />
            {saving || browserBroadcast.state === "starting" ? "Starting broadcast…" : "Go Live From This Device 📷"}
          </button>
          <p className="text-[11px] text-muted-foreground">
            Streams straight from this device's camera and mic — the live scorecard is baked onto the video
            automatically. No extra apps needed.
          </p>
          {autoError && <p className="text-xs text-destructive">{autoError}</p>}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setAdvancedMode(true)}
              className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
            >
              Advanced: use OBS / Streamlabs instead
            </button>
            <button
              onClick={() => setManualMode(true)}
              className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
            >
              Paste an existing link
            </button>
          </div>
        </div>
      )}

      {status === "idle" && advancedMode && !manualMode && (
        <div className="space-y-2">
          <button
            onClick={goLive}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            <Radio className="h-4 w-4 animate-pulse" />
            {saving ? "Starting broadcast…" : "Create Broadcast 🔴"}
          </button>
          {autoError && <p className="text-xs text-destructive">{autoError}</p>}
          <p className="text-[11px] text-muted-foreground">
            Creates a broadcast on your YouTube channel, titled with the two teams and venue. You'll get an
            RTMP URL + Stream Key to paste into your streaming app (OBS, Streamlabs, Larix, etc.) — the
            recording saves to your channel automatically once you end the stream.
          </p>
          <button
            onClick={() => setAdvancedMode(false)}
            className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
          >
            ← Back to Go Live
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
            ← Back to Go Live
          </button>
        </div>
      )}

      {/* ── LIVE ── */}
      {status === "live" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive font-semibold">
            <Radio className="h-4 w-4 animate-pulse" />
            {activeMode === "device" && browserBroadcast.state === "starting" && "Connecting camera…"}
            {activeMode === "device" && browserBroadcast.state === "live" && `Live from this device: "${liveInfo?.title}"`}
            {activeMode === "device" && browserBroadcast.state === "error" && "Camera stream dropped — see below"}
            {activeMode !== "device" && (liveInfo ? `Live: "${liveInfo.title}"` : "Stream linked! Viewers can see it.")}
          </div>

          {activeMode === "device" && browserBroadcast.state === "error" && (
            <p className="text-xs text-destructive">
              {browserBroadcast.error} The YouTube broadcast is still live — you can paste the RTMP URL + Stream
              Key below into OBS/Streamlabs to keep streaming without restarting.
            </p>
          )}

          {/* Camera preview when streaming from this device; otherwise the normal YouTube embed. */}
          {activeMode === "device" && browserBroadcast.cameraStream ? (
            <CameraPreview stream={browserBroadcast.cameraStream} />
          ) : (
            <VideoStreamEmbed matchId={matchId} initialStreamUrl={url || liveInfo?.watchUrl || null} initialStatus="live" />
          )}

          {(liveInfo?.watchUrl || url) && (
            <a
              href={liveInfo?.watchUrl || url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-[11px] font-semibold text-primary underline underline-offset-2"
            >
              Open on YouTube in a new tab →
            </a>
          )}

          {liveInfo && (
            <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {activeMode === "device" ? "Backup — paste into OBS if this device's stream drops" : "Paste these into your streaming app"}
              </p>
              <CopyField label="RTMP Server URL" value={liveInfo.rtmpUrl} />
              <CopyField label="Stream Key" value={liveInfo.streamKey} mask />
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