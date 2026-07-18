# JustCric Go-Live ingest relay

Browsers can send video over WebRTC/MediaRecorder but **cannot speak RTMP**,
which is what YouTube's live ingest requires. This tiny always-on Node
service is the bridge:

```
Scorer's browser  --WebSocket (webm chunks, camera + baked-in scoreboard)-->
  ingest-server.js  --spawns ffmpeg-->
    ffmpeg  --RTMP-->  YouTube (rtmpUrl + streamKey from startYouTubeLive)
```

This is why "click Go Live and it just streams" needs this extra piece —
there's no way around a server-side relay for browser-to-RTMP without an
external app like OBS.

## Why it can't live in the main app

The main JustCric app deploys to Vercel/Render/Cloudflare as a request/
response server (Nitro). This relay needs a **long-lived process per live
match** (one ffmpeg child process, one open WebSocket) — that doesn't fit
serverless functions. Run it as its own small persistent service.

## Run locally

```bash
cd stream-server
npm install
npm start
# listening on ws://localhost:8081/ingest
```

Requires `ffmpeg` on your PATH (`brew install ffmpeg` / `apt install ffmpeg`).

## Deploy (Render — recommended, since the main app already uses Render)

1. In Render, **New → Web Service**, point at this repo, set **Root
   Directory** to `stream-server`.
2. Choose **Docker** as the environment (the provided `Dockerfile` installs
   ffmpeg — Render's native Node buildpack does not include it).
3. No environment variables required. Render gives you a URL like
   `https://justcric-ingest.onrender.com`.
4. In the main app's environment variables, set:
   ```
   VITE_INGEST_WS_URL=wss://justcric-ingest.onrender.com/ingest
   ```
   (`wss://`, not `https://` — same host, WebSocket scheme.)

## Capacity notes

- Each concurrent live match = one ffmpeg process (~1 CPU core, modest
  memory). `MAX_SESSIONS` env var caps concurrent broadcasts (default 20)
  so one host doesn't get oversubscribed — raise it or add another
  instance behind a load balancer as usage grows.
- This relay only handles the "Go Live from this device" one-click flow.
  The "Advanced: use OBS/Streamlabs" fallback in the app still sends
  video straight to YouTube's RTMP and never touches this server.
