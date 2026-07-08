import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl } from "@/utils/getYouTubeEmbedUrl";
import { Link2, Radio, Square, Trash2, Copy, Check, ChevronDown } from "lucide-react";
import { startYouTubeLive, stopYouTubeLive } from "@/lib/api/youtube-live.functions";
import { VideoStreamEmbed } from "@/components/VideoStreamEmbed";
import { useBrowserBroadcast } from "@/hooks/useBrowserBroadcast";
import { useLiveOverlayEvents } from "@/components/live-overlay/useLiveOverlayEvents";
import { batterFigures, bowlerFigures, currentRunRate, requiredRunRate, fmt1 } from "@/lib/live-overlay/liveStats";
import type { CanvasOverlayBar, CanvasPopup } from "@/lib/live-overlay/canvasOverlay";
import type { OverlayBall, OverlayInnings, OverlayMatch, OverlayMember } from "@/lib/live-overlay/types";

type StreamStatus = "idle" | "live" | "ended";

interface Props {
  matchId: string;
  /** Optional — when provided, the one-click "Go Live" streams this device's camera with the
   *  scorecard overlay baked in. Without them the component still works for the manual/OBS flow. */
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

export function AddStreamLink({ matchId, match, innings, balls = [], players = {} }: Props) {
  const [url, setUrl]           = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [status, setStatus]     = useState<StreamStatus>("idle");
  const [saving, setSaving]     = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [liveInfo, setLiveInfo] = useState<{ rtmpUrl: string; streamKey: string; watchUrl: string; title: string } | null>(null);
  const [showManualSetup, setShowManualSetup] = useState(false);

  const broadcast = useBrowserBroadcast();

  // ── Build the overlay data the camera broadcast bakes into the video ──
  const { wicketEvent, newBatterEvent } = useLiveOverlayEvents(innings ?? null, balls, players);

  const overlayRef = useRef<{ bar: CanvasOverlayBar | null; popup: CanvasPopup }>({ bar: null, popup: null });
  useEffect(() => {
    if (!match || !innings) { overlayRef.current = { bar: null, popup: null }; return; }
    const battingTeam = match.team_a.id === innings.batting_team_id ? match.team_a : match.team_b;
    const bowlingTeam = match.team_a.id === innings.bowling_team_id ? match.team_a : match.team_b;
    const strikerStat = batterFigures(balls, innings.striker_id);
    const nonStrikerStat = batterFigures(balls, innings.non_striker_id);
    const bowlerStat = bowlerFigures(balls, innings.bowler_id);
    const oversStr = `${Math.floor(innings.balls / 6)}.${innings.balls % 6}`;
    const crr = currentRunRate(innings.runs, innings.balls);
    const rrr = requiredRunRate(innings.target, innings.runs, match.overs, innings.balls);

    const bar: CanvasOverlayBar = {
      battingShort: battingTeam.short_name || battingTeam.name,
      battingColor: battingTeam.jersey_color || "#003527",
      runs: innings.runs, wickets: innings.wickets, oversStr,
      crr: fmt1(crr), rrr: rrr != null ? fmt1(rrr) : null,
      targetLine: innings.target != null
        ? `Need ${Math.max(0, innings.target - innings.runs)} runs from ${Math.max(0, match.overs * 6 - innings.balls)} balls`
        : null,
      strikerName: innings.striker_id ? players[innings.striker_id]?.player_name ?? "—" : "—",
      strikerRuns: strikerStat.runs, strikerBalls: strikerStat.balls,
      nonStrikerName: innings.non_striker_id ? players[innings.non_striker_id]?.player_name ?? "—" : "—",
      nonStrikerRuns: nonStrikerStat.runs, nonStrikerBalls: nonStrikerStat.balls,
      bowlerName: innings.bowler_id ? players[innings.bowler_id]?.player_name ?? "—" : `vs ${bowlingTeam.short_name || bowlingTeam.name}`,
      bowlerFigures: `${bowlerStat.oversStr}-${bowlerStat.runs}-${bowlerStat.wkts}`,
    };

    let popup: CanvasPopup = null;
    if (wicketEvent) {
      popup = {
        kind: "wicket",
        name: wicketEvent.dismissedPlayer?.player_name ?? "Batter",
        runs: wicketEvent.runs, balls: wicketEvent.balls,
        detail: `${wicketEvent.wicketTypeLabel}${wicketEvent.bowler ? ` · b ${wicketEvent.bowler.player_name}` : ""} · over ${wicketEvent.overAt}`,
      };
    } else if (newBatterEvent) {
      popup = {
        kind: "new_batter",
        name: newBatterEvent.player?.player_name ?? "New Batter",
        jersey: newBatterEvent.player?.jersey_number != null ? String(newBatterEvent.player.jersey_number) : null,
      };
    }

    overlayRef.current = { bar, popup };
  }, [match, innings, balls, players, wicketEvent, newBatterEvent]);

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

  // ── One click: create the YouTube broadcast AND start streaming this device's camera into it ──
  const goLive = async () => {
    setAutoError(null);
    setSaving(true);
    setShowManualSetup(false);
    try {
      const result = await startYouTubeLive({ data: { matchId } });
      setLiveInfo(result);
      setUrl(result.watchUrl);
      setStatus("live");

      await broadcast.start({
        rtmpUrl: result.rtmpUrl,
        streamKey: result.streamKey,
        getOverlay: () => overlayRef.current,
      });
    } catch (e) {
      setAutoError(e instanceof Error ? e.message : "Couldn't start the broadcast");
    } finally {
      setSaving(false);
    }
  };

  const endStreamAuto = async () => {
    setSaving(true);
    broadcast.stop();
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

  const broadcastLabel = useMemo(() => {
    if (broadcast.state === "starting") return "Opening camera…";
    if (broadcast.state === "live") return "Streaming from this device";
    if (broadcast.state === "error") return broadcast.error || "Camera stream failed — use Advanced/OBS below";
    return null;
  }, [broadcast.state, broadcast.error]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>🎥</span> Go Live
      </div>

      {/* ── IDLE ── */}
      {status === "idle" && !manualMode && (
        <div className="space-y-2">
          <button
            onClick={goLive}
            disabled={saving || broadcast.state === "starting"}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
          >
            <Radio className="h-4 w-4 animate-pulse" />
            {saving || broadcast.state === "starting" ? "Starting broadcast…" : "Go Live 🔴"}
          </button>
          {autoError && <p className="text-xs text-destructive">{autoError}</p>}
          {broadcast.error && <p className="text-xs text-destructive">{broadcast.error}</p>}
          <p className="text-[11px] text-muted-foreground">
            One tap: streams this device's camera straight to your JustCric YouTube channel, with the live
            scorecard baked right onto the video. No app, no stream key.
          </p>

          <button
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            Advanced: stream with OBS/Streamlabs instead
          </button>
          {advancedOpen && (
            <button
              onClick={() => setManualMode(true)}
              className="block text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
            >
              Already streaming elsewhere? Paste an existing link
            </button>
          )}
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
            ← Back to one-click Go Live
          </button>
        </div>
      )}

      {/* ── LIVE ── */}
      {status === "live" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive font-semibold">
            <Radio className="h-4 w-4 animate-pulse" />
            {liveInfo ? `Live: "${liveInfo.title}"` : "Stream linked! Viewers can see it."}
          </div>

          {/* Preview right here — no need to leave this page to check it's working.
              YouTube can take up to ~30-60s after the camera connects before video
              actually appears, even once this panel says "live". */}
          <VideoStreamEmbed matchId={matchId} initialStreamUrl={url || liveInfo?.watchUrl || null} initialStatus="live" />
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

          {broadcastLabel && (
            <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${broadcast.state === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-secondary/40 text-foreground"}`}>
              {broadcastLabel}
            </div>
          )}

          {/* Advanced / OBS fallback — only surfaced if the camera broadcast failed,
              and only after the person explicitly asks to see it. Never auto-shown. */}
          {liveInfo && broadcast.state === "error" && !showManualSetup && (
            <button
              onClick={() => setShowManualSetup(true)}
              className="text-[11px] font-semibold text-muted-foreground underline underline-offset-2"
            >
              Show manual setup (OBS/Streamlabs) instead
            </button>
          )}
          {liveInfo && broadcast.state === "error" && showManualSetup && (
            <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">Advanced: stream with OBS/Streamlabs instead</p>
              <CopyField label="RTMP Server URL" value={liveInfo.rtmpUrl} />
              <CopyField label="Stream Key" value={liveInfo.streamKey} mask />
              <p className="text-[11px] text-muted-foreground">
                Paste these into your streaming app — once it connects, you'll go live on YouTube automatically.
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