// Broadcast-style horizontally scrolling ticker. Pauses on hover.
const SAMPLE = [
  { teams: "MUM vs DEL", score: "186/4 (18.2)", state: "LIVE" },
  { teams: "BLR vs CHE", score: "142/7 (16.0)", state: "LIVE" },
  { teams: "KOL vs PUN", score: "Won by 24 runs", state: "FT" },
  { teams: "RAJ vs HYD", score: "Starts 7:30 PM", state: "UP" },
  { teams: "GUJ vs LKN", score: "201/3 (20.0)", state: "FT" },
  { teams: "Dadar CC vs Andheri XI", score: "98/2 (12.4)", state: "LIVE" },
  { teams: "Acme Corp vs Globex", score: "55/1 (6.0)", state: "LIVE" },
  { teams: "Pune Stars vs Nashik Titans", score: "Won by 7 wkts", state: "FT" },
];

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {SAMPLE.map((m, i) => (
        <div key={i} className="flex items-center gap-2.5 whitespace-nowrap">
          <span
            className={
              m.state === "LIVE"
                ? "rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-destructive"
                : m.state === "UP"
                  ? "rounded bg-[color:var(--gold)]/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[color:var(--gold)]"
                  : "rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white/60"
            }
          >
            {m.state}
          </span>
          <span className="text-sm font-semibold text-white/90">{m.teams}</span>
          <span className="font-score text-sm text-[color:var(--gold)]">{m.score}</span>
          <span className="text-white/20">•</span>
        </div>
      ))}
    </div>
  );
}

export function LiveTicker() {
  return (
    <div className="border-y border-border bg-[color:var(--color-ticker)] overflow-hidden">
      <div className="group relative">
        <div className="flex animate-ticker group-hover:[animation-play-state:paused]">
          <Row />
          <Row />
        </div>
      </div>
    </div>
  );
}
