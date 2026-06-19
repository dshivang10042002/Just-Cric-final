import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LiveTicker } from "@/components/layout/LiveTicker";
import { BottomNav } from "@/components/layout/BottomNav";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { supabase } from "@/integrations/supabase/client";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JustCric — Your Cricket. Scored. Shared. Remembered." },
      {
        name: "description",
        content:
          "Free cricket scoring app for clubs, academies and corporate teams. Live ball-by-ball, tournaments, stats and player profiles.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <Navbar />
      <LiveTicker />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        {/* ambient gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[color:var(--gold)]/[0.08] blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-elevate">
              <LiveBadge />
              <span>500+ teams already scoring with JustCric</span>
            </div>

            <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
              Your Cricket.
              <br />
              <span className="text-gradient-lime">Scored.</span>{" "}
              <span className="text-[color:var(--gold)]">Shared.</span>{" "}
              Remembered.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              The free, modern scoring app for local, club, academy and corporate cricket
              across India. Live ball-by-ball, beautiful scorecards, real stats.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/auth"
                search={{ mode: "register" }}
                className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition active:scale-95 hover:brightness-110 glow-primary"
              >
                Start Scoring Free
                <ArrowRight />
              </Link>
              <a
                href="#matches"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground transition active:scale-95 hover:bg-secondary"
              >
                View Live Matches
              </a>
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Free forever · No credit card · Built for grassroots cricket
            </p>
          </div>

          {/* Hero scorecard mock */}
          <div className="mx-auto mt-16 max-w-3xl">
            <ScorecardMock />
          </div>
        </div>
      </section>
      {/* ---------- Live matches ---------- */}
      <LiveMatches />


      {/* ---------- Features ---------- */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Everything for your match day</h2>
          <p className="mt-3 text-muted-foreground">From toss to trophy — JustCric handles it.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            title="Live Scoring"
            desc="Ball-by-ball input with real-time updates to spectators. Works perfectly on mobile at the ground."
            tone="primary"
          />
          <FeatureCard
            title="Tournament Manager"
            desc="Knockout brackets, league tables, auto fixtures. Run your tournament without spreadsheets."
            tone="accent"
          />
          <FeatureCard
            title="Player Profiles"
            desc="Career stats, charts, batting & bowling history. Share your profile with one tap."
            tone="primary"
          />
          <FeatureCard
            title="Stats & Leaderboards"
            desc="Top run-scorers, wicket-takers, best figures. Filter by tournament, week or all time."
            tone="accent"
          />
        </div>
      </section>

      {/* ---------- Trust strip ---------- */}
      <section className="border-y border-border bg-muted/60 py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <p className="label-caps text-muted-foreground">
            Trusted by 500+ teams across India
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 font-display text-base tracking-wide text-foreground/50">
            <span>MUMBAI CC</span>
            <span>•</span>
            <span>BANGALORE STRIKERS</span>
            <span>•</span>
            <span>DELHI ACADEMY</span>
            <span>•</span>
            <span>PUNE WARRIORS</span>
            <span>•</span>
            <span>CHENNAI XI</span>
          </div>
        </div>
      </section>

      {/* ---------- Pricing teaser ---------- */}
      <section id="pricing" className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Free at launch</h2>
        <p className="mt-3 text-muted-foreground">
          Unlimited matches, scorecards, 3 teams and 2 tournaments — forever free.
          Premium with advanced analytics and PDF exports coming soon.
        </p>
        <div className="mt-8">
          <Link
            to="/auth"
            search={{ mode: "register" }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition active:scale-95 hover:brightness-110 glow-primary"
          >
            Create your free account
            <ArrowRight />
          </Link>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div>
            <span className="font-display text-lg text-primary">
              JustCric
            </span>{" "}
            · © {new Date().getFullYear()}
          </div>
          <div className="flex gap-5">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#pricing" className="hover:text-primary">Pricing</a>
            <a href="#" className="hover:text-primary">About</a>
            <a href="#" className="hover:text-primary">Contact</a>
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  tone,
}: {
  title: string;
  desc: string;
  tone: "primary" | "accent";
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-elevate transition hover:border-primary/30">
      <div
        className={
          tone === "primary"
            ? "absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/15"
            : "absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[color:var(--gold)]/15 blur-2xl transition group-hover:bg-[color:var(--gold)]/25"
        }
      />
      <h3 className="font-display text-2xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function ScorecardMock() {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-elevate sm:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LiveBadge />
          <span className="text-xs text-muted-foreground">T20 · Wankhede · Final</span>
        </div>
        <span className="font-score text-xs text-muted-foreground">CRR 11.45</span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="label-caps text-muted-foreground">Mumbai CC</div>
          <div className="font-display text-6xl text-foreground sm:text-7xl">
            <span className="text-[color:var(--gold)]">186</span>
            <span className="text-muted-foreground">/4</span>
          </div>
          <div className="mt-1 font-score text-sm text-muted-foreground">18.2 overs</div>
        </div>

        <div className="hidden text-right sm:block">
          <div className="label-caps text-muted-foreground">Need</div>
          <div className="font-display text-3xl text-primary">67 in 44</div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Striker</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-medium">Rohit Sharma ●</span>
            <span className="font-score text-accent">45(32)</span>
          </div>
        </div>
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Bowler</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-medium">J. Bumrah</span>
            <span className="font-score text-primary">3-0-24-1</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">This over</span>
        <div className="flex gap-1.5">
          {[
            { v: "1", c: "bg-secondary text-foreground" },
            { v: "4", c: "bg-primary text-primary-foreground" },
            { v: "•", c: "bg-secondary text-muted-foreground" },
            { v: "6", c: "bg-accent text-accent-foreground" },
            { v: "W", c: "bg-destructive text-destructive-foreground" },
            { v: "2", c: "bg-secondary text-foreground" },
          ].map((b, i) => (
            <span
              key={i}
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${b.c}`}
            >
              {b.v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type LiveMatchRow = {
  id: string;
  overs: number;
  venue: string | null;
  current_innings: number;
  team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
  team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
  innings: { batting_team_id: string; runs: number; wickets: number; balls: number; target: number | null }[];
  team_a_id: string;
  team_b_id: string;
};

function LiveMatches() {
  const [rows, setRows] = useState<LiveMatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select(
          "id, overs, venue, current_innings, team_a_id, team_b_id, team_a:teams!matches_team_a_id_fkey(name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(name, short_name, jersey_color), innings(batting_team_id, runs, wickets, balls, target)",
        )
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(6);
      if (!active) return;
      setRows((data as unknown as LiveMatchRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!loading && rows.length === 0) return null;

  return (
    <section id="matches" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LiveBadge />
            <span className="label-caps text-destructive">
              Live now
            </span>
          </div>
          <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Catch a match in progress
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => {
            const curInn = m.innings?.find?.((i) => i.batting_team_id) ?? null;
            const lastInn = m.innings?.[m.innings.length - 1] ?? curInn;
            const batting = lastInn
              ? lastInn.batting_team_id === m.team_a_id
                ? m.team_a
                : m.team_b
              : null;
            const oversStr = lastInn ? `${Math.floor(lastInn.balls / 6)}.${lastInn.balls % 6}` : "0.0";
            return (
              <Link
                key={m.id}
                to="/match/$matchId"
                params={{ matchId: m.id }}
                className="group rounded-xl border border-border bg-card p-5 shadow-elevate transition hover:border-primary/30 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 text-destructive">
                    <Radio className="h-3 w-3" /> Live · Inns {m.current_innings}
                  </span>
                  <span>{m.overs} overs</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="grid h-7 w-7 place-items-center rounded-md font-display text-[11px] text-white"
                    style={{ backgroundColor: batting?.jersey_color || "#003527" }}
                  >
                    {(batting?.short_name || batting?.name || "?").slice(0, 3).toUpperCase()}
                  </span>
                  <span className="truncate font-display text-lg tracking-tight">
                    {batting?.name || "—"}
                  </span>
                </div>
                <div className="mt-2 font-display text-4xl tabular-nums text-primary">
                  {lastInn?.runs ?? 0}
                  <span className="text-muted-foreground">/{lastInn?.wickets ?? 0}</span>
                  <span className="ml-2 font-mono text-sm text-muted-foreground">
                    ({oversStr})
                  </span>
                </div>
                {lastInn?.target ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Target <span className="font-mono text-[color:var(--gold)]">{lastInn.target}</span>
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">
                    vs {batting?.name === m.team_a?.name ? m.team_b?.name : m.team_a?.name}
                  </div>
                )}
                {m.venue && (
                  <div className="mt-2 truncate text-[11px] text-muted-foreground">📍 {m.venue}</div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

