import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server-only helpers. Loaded lazily inside handlers so nothing here
// (client secret, refresh token, service-role key) ever reaches the
// browser bundle.
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function getYouTubeAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "YouTube isn't connected yet. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN in your server environment."
    );
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`YouTube auth failed: ${json.error_description ?? json.error ?? res.statusText}`);
  return json.access_token as string;
}

async function yt(path: string, accessToken: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`YouTube API error (${path}): ${json.error?.message ?? res.statusText}`);
  return json;
}

// ─── Start a live broadcast for a match ───
export const startYouTubeLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ matchId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await getAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: match, error: matchErr } = await (supabaseAdmin as any)
      .from("matches")
      .select("id, created_by, venue, team_a_id, team_b_id, team_a:team_a_id(name), team_b:team_b_id(name)")
      .eq("id", data.matchId)
      .single();
    if (matchErr || !match) throw new Error("Match not found");
    if (match.created_by !== context.userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membership } = await (supabaseAdmin as any)
        .from("team_members")
        .select("id")
        .eq("profile_id", context.userId)
        .in("team_id", [match.team_a_id, match.team_b_id])
        .limit(1)
        .maybeSingle();
      if (!membership) throw new Error("Only players in this match's squads can start the stream");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = match as any;
    const teamAName = m.team_a?.name ?? "Team A";
    const teamBName = m.team_b?.name ?? "Team B";
    const title = m.venue ? `${teamAName} vs ${teamBName} — ${m.venue}` : `${teamAName} vs ${teamBName}`;

    const accessToken = await getYouTubeAccessToken();

    // 1) Create the broadcast (this is what becomes the archived video afterwards)
    const broadcast = await yt(
      "liveBroadcasts?part=snippet,status,contentDetails",
      accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          snippet: {
            title: title.slice(0, 100),
            scheduledStartTime: new Date().toISOString(),
          },
          status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: true,
            enableDvr: true,
            recordFromStart: true,
          },
        }),
      }
    );

    // 2) Create the ingestion stream (gives us the RTMP URL + key)
    const stream = await yt("liveStreams?part=snippet,cdn", accessToken, {
      method: "POST",
      body: JSON.stringify({
        snippet: { title: title.slice(0, 100) },
        cdn: { frameRate: "variable", ingestionType: "rtmp", resolution: "variable" },
      }),
    });

    // 3) Bind them together
    await yt(
      `liveBroadcasts/bind?id=${broadcast.id}&part=id,contentDetails&streamId=${stream.id}`,
      accessToken,
      { method: "POST" }
    );

    // 4) Explicitly allow embedding. Every broadcast has an underlying video
    // resource (same id), and that resource's `embeddable` flag — NOT anything
    // on liveBroadcasts — controls whether it can play on justcric.in at all.
    // The API defaults this to false, which is exactly why viewers were seeing
    // "Playback on other websites has been disabled by the video owner."
    try {
      await yt(`videos?part=status`, accessToken, {
        method: "PUT",
        body: JSON.stringify({
          id: broadcast.id,
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
            embeddable: true,
            publicStatsViewable: true,
          },
        }),
      });
    } catch (e) {
      // Don't fail the whole Go Live flow over this — worst case, the person
      // can still watch via the "Open on YouTube" link while this gets fixed.
      console.error("[startYouTubeLive] failed to enable embedding:", e);
    }

    const ingestion = stream.cdn.ingestionInfo;
    const rtmpUrl = ingestion.ingestionAddress as string;
    const streamKey = ingestion.streamName as string;
    const watchUrl = `https://www.youtube.com/watch?v=${broadcast.id}`;

    // Save the secret bits in the locked-down table (service role bypasses RLS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("match_stream_credentials").upsert({
      match_id: data.matchId,
      yt_broadcast_id: broadcast.id,
      yt_stream_id: stream.id,
      rtmp_url: rtmpUrl,
      stream_key: streamKey,
      watch_url: watchUrl,
    });

    // Only the public watch URL goes on the publicly-readable matches row
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("matches")
      .update({ stream_url: watchUrl, stream_status: "live", stream_added_at: new Date().toISOString() })
      .eq("id", data.matchId);

    return { rtmpUrl, streamKey, watchUrl, title };
  });

// ─── End the live broadcast — YouTube auto-archives the recording under the same title ───
export const stopYouTubeLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ matchId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await getAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: match, error: matchErr } = await (supabaseAdmin as any)
      .from("matches")
      .select("id, created_by, team_a_id, team_b_id")
      .eq("id", data.matchId)
      .single();
    if (matchErr || !match) throw new Error("Match not found");
    if (match.created_by !== context.userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: membership } = await (supabaseAdmin as any)
        .from("team_members")
        .select("id")
        .eq("profile_id", context.userId)
        .in("team_id", [match.team_a_id, match.team_b_id])
        .limit(1)
        .maybeSingle();
      if (!membership) throw new Error("Only players in this match's squads can end the stream");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: creds } = await (supabaseAdmin as any)
      .from("match_stream_credentials")
      .select("yt_broadcast_id")
      .eq("match_id", data.matchId)
      .maybeSingle();

    if (creds?.yt_broadcast_id) {
      const accessToken = await getYouTubeAccessToken();
      await yt(
        `liveBroadcasts/transition?broadcastStatus=complete&id=${creds.yt_broadcast_id}&part=id,status`,
        accessToken,
        { method: "POST" }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from("matches")
      .update({ stream_status: "ended" })
      .eq("id", data.matchId);

    return { ok: true };
  });