import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Radio, ChevronLeft, ChevronRight } from "lucide-react";
 
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JustCric — Your Cricket. Scored. Shared. Remembered." },
      { name: "description", content: "Free cricket scoring app for clubs, academies and corporate teams. Live ball-by-ball, tournaments, stats and player profiles." },
    ],
  }),
  component: Landing,
});
 
/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
type LiveMatchRow = {
  id: string; overs: number; venue: string | null; current_innings: number;
  team_a_id: string; team_b_id: string;
  team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
  team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
  innings: { batting_team_id: string; runs: number; wickets: number; balls: number; target: number | null }[];
};
 
/* ─────────────────────────────────────────
   LANDING PAGE
───────────────────────────────────────── */
function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
 
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[color:var(--gold)]/[0.07] blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-12 sm:px-6 sm:pt-28 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-elevate">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              <span>Live ball-by-ball scoring for every team</span>
            </div>
            <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl md:text-8xl">
              Your Cricket.<br />
              <span className="text-gradient-lime">Scored.</span>{" "}
              <span className="text-[color:var(--gold)]">Shared.</span>{" "}
              Remembered.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              The free, modern scoring app for local, club, academy and corporate cricket across India.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" search={{ mode: "register" }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition active:scale-95 hover:brightness-110 glow-primary">
                Start Scoring Free <ArrowRight />
              </Link>
              <a href="#matches" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground transition active:scale-95 hover:bg-secondary">
                View Live Matches
              </a>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Free forever · No credit card · Built for grassroots cricket</p>
          </div>
 
          {/* Live match slider replacing the mock */}
          <div className="mt-16">
            <HeroLiveSlider />
          </div>
        </div>
      </section>
 
      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Built for every cricket team</h2>
          <p className="mt-3 text-muted-foreground">From toss to trophy — JustCric handles it.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Live Scoring", desc: "Ball-by-ball input with real-time updates to spectators. Works perfectly on mobile at the ground.", tone: "primary" },
            { title: "Tournament Manager", desc: "Knockout brackets, league tables, auto fixtures. Run your tournament without spreadsheets.", tone: "accent" },
            { title: "Player Profiles", desc: "Career stats, charts, batting & bowling history. Share your profile with one tap.", tone: "primary" },
            { title: "Stats & Leaderboards", desc: "Top run-scorers, wicket-takers, best figures. Filter by tournament, week or all time.", tone: "accent" },
          ].map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-elevate transition hover:border-primary/30">
              <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition ${f.tone === "primary" ? "bg-primary/10 group-hover:bg-primary/15" : "bg-[color:var(--gold)]/15 group-hover:bg-[color:var(--gold)]/25"}`} />
              <h3 className="font-display text-2xl tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
 
      {/* ── Pricing ── */}
      <section id="pricing" className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Free at launch</h2>
        <p className="mt-3 text-muted-foreground">
          Unlimited matches, scorecards, 3 teams and 2 tournaments — forever free.
          Premium with advanced analytics and PDF exports coming soon.
        </p>
        <div className="mt-8">
          <Link to="/auth" search={{ mode: "register" }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition active:scale-95 hover:brightness-110 glow-primary">
            Create your free account <ArrowRight />
          </Link>
        </div>
      </section>
 
      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div><span className="font-display text-lg text-primary">JustCric</span> · © {new Date().getFullYear()}</div>
          <div className="flex gap-5">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#pricing" className="hover:text-primary">Pricing</a>
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
 
/* ─────────────────────────────────────────
   HERO LIVE SLIDER
   Replaces ScorecardMock — shows real live
   matches in the same card style as the mock
───────────────────────────────────────── */
function HeroLiveSlider() {
  const [rows, setRows] = useState<LiveMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, overs, venue, current_innings, team_a_id, team_b_id, team_a:teams!matches_team_a_id_fkey(name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(name, short_name, jersey_color), innings(batting_team_id, runs, wickets, balls, target)")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(8);
      setRows((data as unknown as LiveMatchRow[]) ?? []);
      setLoading(false);
    })();
  }, []);
 
  // Auto-rotate every 5s
  useEffect(() => {
    if (rows.length <= 1) return;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % rows.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [rows.length]);
 
  const prev = () => { setIdx((i) => (i - 1 + rows.length) % rows.length); };
  const next = () => { setIdx((i) => (i + 1) % rows.length); };
 
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="h-[220px] animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }
 
  if (rows.length === 0) {
    /* No live matches — show a polished "no matches" placeholder in the same card style */
    return (
      <div className="mx-auto max-w-3xl">
        <div className="relative rounded-2xl border border-border bg-card p-6 shadow-elevate sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-border" />
              <span className="text-xs text-muted-foreground">No live matches right now</span>
            </div>
            <span className="text-xs text-muted-foreground">JustCric</span>
          </div>
          <div className="text-center py-6">
            <div className="font-display text-4xl text-muted-foreground/30 mb-3">🏏</div>
            <p className="text-sm text-muted-foreground">Start a match to see it appear here live.</p>
            <Link to="/auth" search={{ mode: "register" }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
              Start scoring free
            </Link>
          </div>
        </div>
      </div>
    );
  }
 
  const m = rows[idx];
  const lastInn = m.innings?.[m.innings.length - 1] ?? null;
  const firstInn = m.innings?.[0] ?? null;
  const battingTeam = lastInn?.batting_team_id === m.team_a_id ? m.team_a : m.team_b;
  const bowlingTeam = lastInn?.batting_team_id === m.team_a_id ? m.team_b : m.team_a;
  const oversStr = lastInn ? `${Math.floor(lastInn.balls / 6)}.${lastInn.balls % 6}` : "0.0";
  const crr = lastInn && lastInn.balls > 0 ? ((lastInn.runs / lastInn.balls) * 6).toFixed(2) : "—";
 
  return (
    <div className="mx-auto max-w-3xl" id="matches">
      <Link to="/match/$matchId" params={{ matchId: m.id }}
        className="group relative block rounded-2xl border border-border bg-card p-6 shadow-elevate transition hover:border-primary/30 sm:p-8">
 
        {/* Top row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
              <Radio className="h-3 w-3 animate-pulse" /> Live
            </span>
            <span className="text-xs text-muted-foreground">
              T{m.overs}{m.venue ? ` · ${m.venue}` : ""} · Inns {m.current_innings}
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">CRR {crr}</span>
        </div>
 
        {/* Score */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{battingTeam?.name}</div>
            <div className="font-display text-6xl sm:text-7xl mt-0.5">
              <span className="text-[color:var(--gold)]">{lastInn?.runs ?? 0}</span>
              <span className="text-muted-foreground">/{lastInn?.wickets ?? 0}</span>
            </div>
            <div className="mt-1 font-mono text-sm text-muted-foreground">{oversStr} overs</div>
          </div>
          <div className="hidden text-right sm:block">
            {lastInn?.target ? (
              <>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Need</div>
                <div className="font-display text-3xl text-primary mt-0.5">
                  {Math.max(0, lastInn.target - lastInn.runs)} in {Math.max(0, m.overs * 6 - lastInn.balls)}
                </div>
              </>
            ) : firstInn && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{bowlingTeam?.name}</div>
                <div className="font-display text-xl text-muted-foreground mt-0.5">Yet to bat</div>
              </>
            )}
          </div>
        </div>
 
        {/* Prev innings score if 2nd innings */}
        {m.current_innings === 2 && firstInn && (
          <div className="mt-3 text-xs text-muted-foreground">
            {bowlingTeam?.name} scored <span className="font-mono text-foreground">{firstInn.runs}/{firstInn.wickets}</span>
          </div>
        )}
 
        <div className="mt-4 text-xs text-primary group-hover:underline">View full scorecard →</div>
      </Link>
 
      {/* Dots + arrows */}
      {rows.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button onClick={prev} className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {rows.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          <button onClick={next} className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
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