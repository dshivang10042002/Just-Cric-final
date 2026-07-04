// JustCric Go-Live ingest relay.
//
// Browsers can't speak RTMP directly, so this tiny always-on Node process
// sits between the scorer's browser (WebSocket, webm/vp8+opus chunks) and
// YouTube's RTMP ingest (ffmpeg, h264/aac/flv). One WebSocket connection =
// one ffmpeg process = one live broadcast.
//
// Run with: node ingest-server.js
// Requires: `ffmpeg` on PATH (apt install ffmpeg / included in the provided Dockerfile).

import { WebSocketServer } from "ws";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { URL } from "node:url";

const PORT = process.env.PORT || 8081;
const MAX_SESSIONS = Number(process.env.MAX_SESSIONS || 20);

const httpServer = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer, path: "/ingest" });
let activeSessions = 0;

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const rtmpUrl = url.searchParams.get("rtmpUrl");
  const streamKey = url.searchParams.get("streamKey");

  if (!rtmpUrl || !streamKey) {
    ws.close(4000, "Missing rtmpUrl or streamKey");
    return;
  }
  if (activeSessions >= MAX_SESSIONS) {
    ws.close(4001, "Server at capacity, try again shortly");
    return;
  }

  activeSessions++;
  const destination = `${rtmpUrl.replace(/\/+$/, "")}/${streamKey}`;
  console.log(`[ingest] session start -> ${rtmpUrl}/**** (active: ${activeSessions})`);

  // -f webm: input is the fragmented webm coming straight out of MediaRecorder.
  // -c:v libx264 + zerolatency: real-time-friendly re-encode to something YouTube's RTMP ingest accepts.
  const ffmpeg = spawn("ffmpeg", [
    "-f", "webm",
    "-i", "pipe:0",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-b:v", "2500k",
    "-maxrate", "2500k",
    "-bufsize", "5000k",
    "-g", "60",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "44100",
    "-f", "flv",
    destination,
  ]);

  ffmpeg.stderr.on("data", (chunk) => {
    // Keep last-line-only logging; ffmpeg is chatty by design.
    const line = chunk.toString().trim().split("\n").pop();
    if (line) console.log(`[ffmpeg] ${line}`);
  });

  ffmpeg.on("exit", (code, signal) => {
    console.log(`[ingest] ffmpeg exited (code=${code}, signal=${signal})`);
    if (ws.readyState === ws.OPEN) ws.close(1011, "Encoder stopped");
  });

  ws.on("message", (data, isBinary) => {
    if (!isBinary) return;
    if (ffmpeg.stdin.writable) ffmpeg.stdin.write(data);
  });

  const cleanup = () => {
    activeSessions = Math.max(0, activeSessions - 1);
    if (!ffmpeg.killed) {
      try { ffmpeg.stdin.end(); } catch { /* already closed */ }
      setTimeout(() => { if (!ffmpeg.killed) ffmpeg.kill("SIGKILL"); }, 3000);
    }
    console.log(`[ingest] session end (active: ${activeSessions})`);
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);
});

httpServer.listen(PORT, () => {
  console.log(`JustCric ingest relay listening on :${PORT} (ws path /ingest)`);
});
