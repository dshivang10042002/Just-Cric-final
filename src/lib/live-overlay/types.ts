// Minimal structural types the overlay system needs — deliberately loose so
// they accept the richer `Match` / `Innings` / `Ball` / `Member` shapes
// already defined in match.$matchId.tsx and matches.$matchId.score.tsx
// without any casting at the call site.
import type { OverlayBall } from "./liveStats";

export type OverlayTeam = { id: string; name: string; short_name: string | null; jersey_color: string | null };

export type OverlayMatch = {
  overs: number;
  team_a: OverlayTeam;
  team_b: OverlayTeam;
};

export type OverlayInnings = {
  id: string;
  innings_no: number;
  batting_team_id: string;
  bowling_team_id: string;
  runs: number;
  wickets: number;
  balls: number;
  target: number | null;
  striker_id: string | null;
  non_striker_id: string | null;
  bowler_id: string | null;
};

export type OverlayMember = {
  id: string;
  player_name: string;
  jersey_number: number | null;
  avatar_url?: string | null;
  role?: string | null;
};

export type { OverlayBall };
