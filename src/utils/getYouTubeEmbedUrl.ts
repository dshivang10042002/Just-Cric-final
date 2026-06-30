/**
 * Converts any YouTube URL format into an embed URL.
 * Returns null if the input is not a valid YouTube URL.
 *
 * Supported formats:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/live/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null;

  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace("www.", "");
    let videoId: string | null = null;

    if (host === "youtube.com") {
      if (u.pathname === "/watch") {
        videoId = u.searchParams.get("v");
      } else if (
        u.pathname.startsWith("/live/") ||
        u.pathname.startsWith("/shorts/")
      ) {
        videoId = u.pathname.split("/")[2] ?? null;
      } else if (u.pathname.startsWith("/embed/")) {
        // Already an embed URL — extract and re-build cleanly
        videoId = u.pathname.split("/")[2] ?? null;
      }
    } else if (host === "youtu.be") {
      videoId = u.pathname.slice(1).split("?")[0] || null;
    }

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) return null;

    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
  } catch {
    return null;
  }
}