// Draws the same scorecard bar / wicket / new-batter graphics used by the
// HTML overlay (src/components/live-overlay/*) directly onto a <canvas>
// frame, so they end up baked into the pixels sent to YouTube — meaning
// viewers watching on the YouTube app (not just justcric.com) still see
// the scorecard, wicket, and new-batter graphics.

export type CanvasOverlayBar = {
  battingShort: string;
  battingColor: string;
  runs: number;
  wickets: number;
  oversStr: string;
  crr: string;
  rrr: string | null;
  targetLine: string | null;
  strikerName: string; strikerRuns: number; strikerBalls: number;
  nonStrikerName: string; nonStrikerRuns: number; nonStrikerBalls: number;
  bowlerName: string; bowlerFigures: string;
};

export type CanvasWicketCard = {
  kind: "wicket";
  name: string;
  runs: number;
  balls: number;
  detail: string; // "Bowled · b Sharma · over 12.4"
};

export type CanvasNewBatterCard = {
  kind: "new_batter";
  name: string;
  jersey: string | null;
};

export type CanvasPopup = CanvasWicketCard | CanvasNewBatterCard | null;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Bottom scorecard bar — call every frame after drawing the camera image. */
export function drawScoreBar(ctx: CanvasRenderingContext2D, w: number, h: number, bar: CanvasOverlayBar) {
  const barW = Math.min(720, w * 0.66);
  const barH = bar.targetLine ? 118 : 96;
  const x = (w - barW) / 2;
  const y = h - barH - 24;

  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#000000";
  roundRect(ctx, x, y, barW, barH, 12);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Team chip
  ctx.fillStyle = bar.battingColor || "#003527";
  ctx.beginPath();
  ctx.arc(x + 26, y + 24, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(bar.battingShort.slice(0, 3).toUpperCase(), x + 26, y + 28);

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`${bar.battingShort}  ${bar.runs}-${bar.wickets}`, x + 52, y + 22);
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(`(${bar.oversStr} ov)`, x + 52, y + 38);

  ctx.textAlign = "right";
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`CRR ${bar.crr}`, x + barW - 14, y + 20);
  if (bar.rrr) {
    ctx.fillStyle = "#fcd34d";
    ctx.fillText(`RRR ${bar.rrr}`, x + barW - 14, y + 36);
  }

  let rowY = y + 60;
  if (bar.targetLine) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#fcd34d";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(bar.targetLine, x + 14, rowY);
    rowY += 20;
  }

  ctx.textAlign = "left";
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(`✦ ${bar.strikerName}`, x + 14, rowY);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`${bar.strikerRuns} (${bar.strikerBalls})`, x + barW / 2 - 10, rowY);

  ctx.textAlign = "left";
  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(bar.nonStrikerName, x + 14, rowY + 18);
  ctx.textAlign = "right";
  ctx.fillText(`${bar.nonStrikerRuns} (${bar.nonStrikerBalls})`, x + barW / 2 - 10, rowY + 18);

  ctx.textAlign = "right";
  ctx.font = "bold 12px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(bar.bowlerName, x + barW - 14, rowY);
  ctx.font = "11px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(bar.bowlerFigures, x + barW - 14, rowY + 18);

  ctx.restore();
}

/** Top wicket / new-batter card — call every frame while a popup is active. */
export function drawPopupCard(ctx: CanvasRenderingContext2D, w: number, popup: CanvasWicketCard | CanvasNewBatterCard) {
  const cardW = Math.min(420, w * 0.5);
  const cardH = 92;
  const x = (w - cardW) / 2;
  const y = 32;
  const accent = popup.kind === "wicket" ? "#dc2626" : "#047857";
  const title = popup.kind === "wicket" ? "🎯 WICKET!" : "🏏 NEW BATTER";

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#000";
  roundRect(ctx, x, y, cardW, cardH, 12);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = accent;
  roundRect(ctx, x, y, cardW, 22, 0);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, x + 12, y + 15);

  ctx.font = "bold 16px sans-serif";
  ctx.fillText(popup.name, x + 12, y + 46);

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  if (popup.kind === "wicket") {
    ctx.fillText(`${popup.runs} (${popup.balls})  ·  ${popup.detail}`, x + 12, y + 66);
  } else if (popup.jersey) {
    ctx.fillText(`#${popup.jersey}  ·  In to bat`, x + 12, y + 66);
  } else {
    ctx.fillText("In to bat", x + 12, y + 66);
  }
  ctx.restore();
}
