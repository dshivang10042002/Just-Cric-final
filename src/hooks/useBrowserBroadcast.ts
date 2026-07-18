import { useCallback, useRef, useState } from "react";
import { drawScoreBar, drawPopupCard, type CanvasOverlayBar, type CanvasPopup } from "@/lib/live-overlay/canvasOverlay";

export type BroadcastState = "idle" | "starting" | "live" | "error";

interface StartArgs {
  rtmpUrl: string;
  streamKey: string;
  /** Called once per animation frame so the caller can supply the latest scorecard bar / popup to bake in. */
  getOverlay: () => { bar: CanvasOverlayBar | null; popup: CanvasPopup };
}

const INGEST_WS_URL = import.meta.env.VITE_INGEST_WS_URL as string | undefined;

/**
 * Captures the device camera + mic, composites the live scoreboard overlay
 * on top every frame, and streams the result to a small relay server
 * (see /stream-server) that forwards it to YouTube's RTMP ingest — so the
 * scorer only ever clicks "Go Live", no OBS/Streamlabs/stream key required.
 */
export function useBrowserBroadcast() {
  const [state, setState] = useState<BroadcastState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    setCameraStream(null);
    setState("idle");
  }, []);

  const start = useCallback(async ({ rtmpUrl, streamKey, getOverlay }: StartArgs) => {
    setError(null);
    setState("starting");

    if (!INGEST_WS_URL) {
      setError("Streaming relay isn't configured (VITE_INGEST_WS_URL is missing). Use 'Advanced: stream with OBS' instead.");
      setState("error");
      return;
    }

    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true,
      });
      mediaStreamRef.current = camera;
      setCameraStream(camera);

      const video = document.createElement("video");
      video.muted = true;
      video.srcObject = camera;
      await video.play();
      videoElRef.current = video;

      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported on this device/browser");
      canvasRef.current = canvas;

      const drawFrame = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { bar, popup } = getOverlay();
        if (bar) drawScoreBar(ctx, canvas.width, canvas.height, bar);
        if (popup) drawPopupCard(ctx, canvas.width, popup);
        rafRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
      const audioTrack = camera.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);

      const ws = new WebSocket(
        `${INGEST_WS_URL}?rtmpUrl=${encodeURIComponent(rtmpUrl)}&streamKey=${encodeURIComponent(streamKey)}`,
      );
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error("Couldn't reach the streaming relay server"));
      });

      const recorder = new MediaRecorder(canvasStream, {
        mimeType: "video/webm;codecs=vp8,opus",
        videoBitsPerSecond: 2_500_000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          e.data.arrayBuffer().then((buf) => ws.send(buf));
        }
      };
      recorder.start(500); // flush every 500ms for low-latency relay
      recorderRef.current = recorder;

      ws.onclose = () => stop();

      setState("live");
    } catch (e) {
      stop();
      setError(e instanceof Error ? e.message : "Couldn't start the camera broadcast");
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { state, error, cameraStream, start, stop };
}