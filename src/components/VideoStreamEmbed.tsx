import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getYouTubeEmbedUrl } from "@/utils/getYouTubeEmbedUrl";
import { ExternalLink, Radio } from "lucide-react";

type StreamStatus = "idle" | "live" | "ended";

interface Props {
  matchId: string;
  initialStreamUrl: string | null;
  initialStatus: StreamStatus;
  /** Optional live scorecard bar / wicket / new-batter cards rendered on top of the video. */
  overlay?: ReactNode;
}

export function VideoStreamEmbed({ matchId, initialStreamUrl, initialStatus, overlay }: Props) {
  const [streamUrl, setStreamUrl] = useState<string | null>(initialStreamUrl);
  const [status, setStatus]       = useState<StreamStatus>(initialStatus);

  // Realtime subscription — auto-shows video if scorer adds URL after page load
  useEffect(() => {
    const channel = supabase
      .channel(`stream-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const updated = payload.new as { stream_url?: string | null; stream_status?: string };
          if (updated.stream_url !== undefined) setStreamUrl(updated.stream_url ?? null);
          if (updated.stream_status) setStatus(updated.stream_status as StreamStatus);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const embedUrl = streamUrl ? getYouTubeEmbedUrl(streamUrl) : null;
  if (!embedUrl || status === "idle") return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elevate">
      {/* Badge row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          {status === "live" ? (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-destructive">
              <Radio className="h-3 w-3 animate-pulse" /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              ▶ Match Replay
            </span>
          )}
        </div>
        <a
          href={streamUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Watch on YouTube <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Responsive 16:9 iframe */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          src={embedUrl}
          title={status === "live" ? "Live Cricket Stream" : "Match Replay"}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
        {status === "live" && overlay}
      </div>
    </div>
  );
}