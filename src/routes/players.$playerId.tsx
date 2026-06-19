import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { ArrowLeft, User } from "lucide-react";


export const Route = createFileRoute("/players/$playerId")({
  head: () => ({ meta: [{ title: "Player — JustCric" }] }),
  component: PlayerProfile,
});

type Member = {
  id: string;
  player_name: string;
  jersey_number: number | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  team: { id: string; name: string; jersey_color: string | null } | null;
};
type BallRow = {
  runs: number;
  extra_type: string | null;
  is_wicket: boolean;
  wicket_type: string | null;
  batter_id: string | null;
  bowler_id: string | null;
  dismissed_player_id: string | null;
  innings_id: string;
};

function PlayerProfile() {
  const { playerId } = Route.useParams();
  const [m, setM] = useState<Member | null>(null);
  const [bat, setBat] = useState({ inns: 0, runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, hs: 0 });
  const [bowl, setBowl] = useState({ inns: 0, runs: 0, legal: 0, wkts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: mem } = await supabase
        .from("team_members")
        .select(
          "id, player_name, jersey_number, role, batting_style, bowling_style, team:teams(id, name, jersey_color)",
        )
        .eq("id", playerId)
        .maybeSingle();
      setM(mem as unknown as Member);

      const { data: balls } = await supabase
        .from("balls")
        .select(
          "runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id, dismissed_player_id, innings_id",
        )
        .or(`batter_id.eq.${playerId},bowler_id.eq.${playerId},dismissed_player_id.eq.${playerId}`);
      const bs = (balls as BallRow[]) ?? [];

      // batting
      const batInnings = new Map<string, { runs: number; balls: number; fours: number; sixes: number }>();
      bs.filter((b) => b.batter_id === playerId).forEach((b) => {
        const row = batInnings.get(b.innings_id) ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
        if (b.extra_type !== "wide") row.balls++;
        const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
        if (isBatRun) {
          const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
          row.runs += r;
          if (r === 4) row.fours++;
          if (r === 6) row.sixes++;
        }
        batInnings.set(b.innings_id, row);
      });
      const batAgg = { inns: batInnings.size, runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, hs: 0 };
      batInnings.forEach((r) => {
        batAgg.runs += r.runs;
        batAgg.balls += r.balls;
        batAgg.fours += r.fours;
        batAgg.sixes += r.sixes;
        if (r.runs > batAgg.hs) batAgg.hs = r.runs;
      });
      batAgg.outs = bs.filter((b) => b.dismissed_player_id === playerId).length;
      setBat(batAgg);

      // bowling
      const bowlInnings = new Set<string>();
      const bowlAgg = { inns: 0, runs: 0, legal: 0, wkts: 0 };
      bs.filter((b) => b.bowler_id === playerId).forEach((b) => {
        bowlInnings.add(b.innings_id);
        bowlAgg.runs += b.runs;
        if (b.extra_type !== "wide" && b.extra_type !== "noball") bowlAgg.legal++;
        if (b.is_wicket && b.wicket_type !== "runout") bowlAgg.wkts++;
      });
      bowlAgg.inns = bowlInnings.size;
      setBowl(bowlAgg);

      setLoading(false);
    })();
  }, [playerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (!m) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10 text-center text-muted-foreground">
          Player not found.
        </div>
      </div>
    );
  }

  const avg = bat.outs > 0 ? (bat.runs / bat.outs).toFixed(2) : bat.runs > 0 ? "—" : "0";
  const sr = bat.balls > 0 ? ((bat.runs / bat.balls) * 100).toFixed(1) : "—";
  const econ = bowl.legal > 0 ? ((bowl.runs / bowl.legal) * 6).toFixed(2) : "—";
  const overs = `${Math.floor(bowl.legal / 6)}.${bowl.legal % 6}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Leaderboard
        </Link>

        <section className="mt-3 flex items-center gap-4 rounded-2xl border border-border bg-card p-6">
          <span
            className="grid h-16 w-16 place-items-center rounded-full font-display text-2xl text-white"
            style={{ backgroundColor: m.team?.jersey_color || "#003527" }}
          >
            {m.jersey_number ?? <User className="h-6 w-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-4xl tracking-tight">{m.player_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {m.team?.name ?? "Free agent"}
              {m.role && <span className="ml-2 capitalize">· {m.role}</span>}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {m.batting_style && `bat: ${m.batting_style}`}
              {m.batting_style && m.bowling_style && " · "}
              {m.bowling_style && `bowl: ${m.bowling_style}`}
            </p>
          </div>
          <FollowButton entityType="player" entityId={playerId} size="sm" />
        </section>


        <section className="mt-5 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl">Batting</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            <Stat label="Inns" v={bat.inns} />
            <Stat label="Runs" v={bat.runs} accent />
            <Stat label="HS" v={bat.hs} />
            <Stat label="Avg" v={avg} />
            <Stat label="SR" v={sr} />
            <Stat label="4s/6s" v={`${bat.fours}/${bat.sixes}`} />
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl">Bowling</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Inns" v={bowl.inns} />
            <Stat label="Overs" v={overs} />
            <Stat label="Wkts" v={bowl.wkts} accent />
            <Stat label="Econ" v={econ} />
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, v, accent }: { label: string; v: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accent ? "text-primary" : "text-foreground"}`}>
        {v}
      </p>
    </div>
  );
}
