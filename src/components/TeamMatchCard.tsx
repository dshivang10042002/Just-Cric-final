import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";

export type TeamMatchRow = {
  id: string;
  overs: number;
  venue: string | null;
  status: "scheduled" | "live" | "completed";
  result_text: string | null;
  created_at: string;
  winner_team_id: string | null;
  team_a_id: string;
  team_b_id: string;
  team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
  team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
  innings: { batting_team_id: string; runs: number; wickets: number; balls: number }[];
};

/**
 * Compact match card shown from the perspective of a single team (`teamId`):
 * highlights the opponent, shows W/L/Result, and always links to the public
 * scorecard at /match/$matchId.
 */
export function TeamMatchCard({ match, teamId, compact }: { match: TeamMatchRow; teamId: string; compact?: boolean }) {
  const isTeamA = match.team_a_id === teamId;
  const self = isTeamA ? match.team_a : match.team_b;
  const opponent = isTeamA ? match.team_b : match.team_a;
  const selfInnings = match.innings?.find((i) => i.batting_team_id === teamId) ?? null;
  const oppInnings = match.innings?.find((i) => i.batting_team_id !== teamId) ?? null;

  const outcome: "won" | "lost" | "tied" | null =
    match.status !== "completed"
      ? null
      : !match.winner_team_id
        ? "tied"
        : match.winner_team_id === teamId
          ? "won"
          : "lost";

  const oversStr = (inn: { balls: number } | null) => (inn ? `${Math.floor(inn.balls / 6)}.${inn.balls % 6}` : null);

  return (
    <Link
      to="/match/$matchId"
      params={{ matchId: match.id }}
      className={`group block shrink-0 overflow-hidden rounded-2xl border bg-card shadow-elevate transition hover:border-primary/30 hover:shadow-lg active:scale-[0.99] ${
        compact ? "w-[260px] snap-start" : "w-full"
      } ${
        outcome === "won"
          ? "border-primary/30"
          : outcome === "lost"
            ? "border-destructive/20"
            : "border-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {match.status === "live" && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
              <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
            </span>
          )}
          {outcome === "won" && (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              Won
            </span>
          )}
          {outcome === "lost" && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive">
              Lost
            </span>
          )}
          {outcome === "tied" && (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tied
            </span>
          )}
          {match.status === "scheduled" && (
            <span className="shrink-0 rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Upcoming
            </span>
          )}
          <span className="truncate text-[11px] text-muted-foreground">
            {match.overs} Ov{match.venue ? ` · ${match.venue}` : ""}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {new Date(match.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      <div className="space-y-2 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md font-display text-[10px] font-bold text-white"
            style={{ backgroundColor: self?.jersey_color || "#003527" }}
          >
            {(self?.short_name || self?.name || "").slice(0, 3).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {self?.name ?? "Your team"}
          </span>
          {selfInnings ? (
            <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
              {selfInnings.runs}/{selfInnings.wickets}
              {oversStr(selfInnings) && <span className="ml-1 text-[10px] text-muted-foreground">({oversStr(selfInnings)})</span>}
            </span>
          ) : (
            <span className="shrink-0 text-[11px] italic text-muted-foreground">Yet to bat</span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md font-display text-[10px] font-bold text-white"
            style={{ backgroundColor: opponent?.jersey_color || "#1a472a" }}
          >
            {(opponent?.short_name || opponent?.name || "").slice(0, 3).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{opponent?.name ?? "Opponent"}</span>
          {oppInnings ? (
            <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
              {oppInnings.runs}/{oppInnings.wickets}
              {oversStr(oppInnings) && <span className="ml-1 text-[10px] text-muted-foreground">({oversStr(oppInnings)})</span>}
            </span>
          ) : (
            <span className="shrink-0 text-[11px] italic text-muted-foreground">Yet to bat</span>
          )}
        </div>
      </div>

      {match.result_text && (
        <div className="border-t border-border/50 px-3.5 py-2">
          <p className="truncate text-xs font-semibold text-primary">{match.result_text}</p>
        </div>
      )}
    </Link>
  );
}