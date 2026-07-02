import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { BlogSection } from "@/components/landing/BlogSection";
import { PostsSection } from "@/components/landing/PostsSection";
import { supabase } from "@/integrations/supabase/client";
import { Radio, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JustCric — Free Cricket Scoring App India | Live Scorecard & Stats" },
      { name: "description", content: "JustCric is India's free cricket scoring app for clubs, academies, corporate & local teams. Live ball-by-ball scorecard, player stats, tournaments & leaderboards. Start scoring in 30 seconds." },
      { name: "keywords", content: "cricket scoring app india, live cricket scorecard, justcric, free cricket app, ball by ball scoring, cricket scorer online, cricket stats app, local cricket app, club cricket scoring, cricket tournament app india, online cricket scorecard, cricket scoring software india" },
      { name: "author", content: "JustCric" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "revisit-after", content: "3 days" },
      { name: "language", content: "English" },
      { name: "geo.region", content: "IN" },
      { name: "geo.country", content: "India" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "JustCric" },
      { property: "og:title", content: "JustCric — Free Cricket Scoring App India | Live Scorecard & Stats" },
      { property: "og:description", content: "India's free cricket scoring app. Live ball-by-ball scorecards, player profiles, tournaments and leaderboards for clubs, academies & corporate teams." },
      { property: "og:url", content: "https://justcric.in" },
      { property: "og:image", content: "https://justcric.in/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: "en_IN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "JustCric — Free Cricket Scoring App India" },
      { name: "twitter:description", content: "Live ball-by-ball scorecard, player stats & tournaments for every cricket team in India. Free forever." },
      { name: "twitter:image", content: "https://justcric.in/og-image.png" },
      { name: "theme-color", content: "#003527" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "JustCric" },
    ],
    links: [{ rel: "canonical", href: "https://justcric.in/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", "@id": "https://justcric.in/#website", "url": "https://justcric.in/", "name": "JustCric", "description": "Free cricket scoring app for India." },
          { "@type": "SoftwareApplication", "name": "JustCric", "operatingSystem": "Web", "applicationCategory": "SportsApplication", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" } },
        ],
      }),
    }],
  }),
  component: Landing,
});

/* ─── Types ─── */
type LiveMatch = {
  id: string; overs: number; venue: string | null; current_innings: number;
  team_a_id: string; team_b_id: string;
  team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
  team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
  innings: { batting_team_id: string; runs: number; wickets: number; balls: number; target: number | null }[];
};
type PlayerStat = {
  id: string; name: string; avatar: string | null;
  value: number; sub: string; team: string;
  role: string | null; city: string | null;
  batting_style: string | null; bowling_style: string | null;
  matches: number; wkts?: number; runs?: number;
};
type RecentPerf = { id: string; matchLabel: string; date: string; playerName: string; avatar: string | null; line: string; type: "bat" | "bowl" | "motm" };

/* ════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════ */
function Landing() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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
              Live ball-by-ball scoring for every team
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

            </div>
            <p className="mt-5 text-xs text-muted-foreground">Free forever · No credit card · Built for grassroots cricket</p>
          </div>
        </div>
      </section>

      {/* ── All sections gated behind login ── */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 space-y-16">
        {isLoggedIn ? (
          <>
            <div id="live"><HeroLiveSlider /></div>
            <MyMatches />
            <BestPlayers />
            <BestStrikers />
            <MVPLeaderboard />
            <PostsSection />
            <RecentPerformances />
            <BlogSection />
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <div className="text-4xl mb-4">🏏</div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight">See who's dominating JustCric</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
              Sign in to see live matches, your scorecards, top players and recent performances.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/auth" search={{ mode: "register" }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95 hover:brightness-110">
                Create free account
              </Link>
              <Link to="/auth" search={{ mode: "login" }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold transition active:scale-95 hover:bg-secondary">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Pricing — only for logged-out users ── */}
      {!isLoggedIn && (
        <section id="pricing" className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Free at launch</h2>
          <p className="mt-3 text-muted-foreground">Unlimited matches, scorecards, 3 teams and 2 tournaments — forever free.</p>
          <div className="mt-8">
            <Link to="/auth" search={{ mode: "register" }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition active:scale-95 hover:brightness-110 glow-primary">
              Create your free account <ArrowRight />
            </Link>
          </div>
        </section>
      )}

      {/* ── Dark footer ── */}
      <footer style={{ background: "#0f172a" }}>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <span className="font-display text-lg text-white">JustCric</span>
              <p className="mt-1 max-w-xs text-xs text-gray-400">The free, modern scoring app for local, club, academy and corporate cricket across India.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
              <a href="#live" className="text-gray-300 transition hover:text-white">Live</a>
              <Link to="/features" className="text-gray-300 transition hover:text-white">Features</Link>
              <Link to="/about" className="text-gray-300 transition hover:text-white">About</Link>
              {!isLoggedIn && <Link to="/pricing" className="text-gray-300 transition hover:text-white">Pricing</Link>}
              <Link to="/contact" className="text-gray-300 transition hover:text-white">Contact</Link>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-sm text-white sm:text-left">
            © JustCric {new Date().getFullYear()} — All rights reserved
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}


/* ════════════════════════════════════════
   SHARED CRICBUZZ-STYLE MATCH CARD
════════════════════════════════════════ */
function CricMatchCard({ m, linkToScore = false }: {
  m: {
    id: string; status: string; result_text: string | null;
    overs: number; venue: string | null; created_at: string;
    team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
    team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
    innings?: { batting_team_id: string; runs: number; wickets: number; balls: number; target: number | null }[];
  };
  linkToScore?: boolean;
}) {
  const inn1 = m.innings?.[0] ?? null;
  const inn2 = m.innings?.[1] ?? null;
  const currentInn = inn2 ?? inn1;
  const ta = m.team_a;
  const tb = m.team_b;
  const linkTo = m.status === "completed" ? `/match/${m.id}` : linkToScore ? `/matches/${m.id}/score` : `/match/${m.id}`;
  const oversStr = (inn: { balls: number } | null) => inn ? `${Math.floor(inn.balls / 6)}.${inn.balls % 6}` : null;
  const isBattingA = currentInn && ta && currentInn.batting_team_id !== (tb as { id?: string } | null)?.id;
  const isBattingB = currentInn && tb && currentInn.batting_team_id === (tb as { id?: string } | null)?.id;

  return (
    <a href={linkTo}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-elevate transition hover:border-primary/30 hover:shadow-lg active:scale-[0.99]">
      {/* Top meta bar */}
      <div className="flex items-center justify-between border-b border-border/50 bg-secondary/30 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {m.status === "live" && (
            <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-destructive shrink-0">
              <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
            </span>
          )}
          {m.status === "completed" && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Result</span>
          )}
          {m.status === "scheduled" && (
            <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary shrink-0">Upcoming</span>
          )}
          <span className="text-[11px] text-muted-foreground truncate">{m.overs} Overs{m.venue ? ` · ${m.venue}` : ""}</span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
          {new Date(m.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </span>
      </div>

      {/* Team rows */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Team A */}
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: ta?.jersey_color || "#003527" }}>
            {(ta?.short_name || ta?.name || "A").slice(0, 3).toUpperCase()}
          </span>
          <span className={`flex-1 min-w-0 truncate text-sm font-semibold ${isBattingA ? "text-foreground" : "text-muted-foreground"}`}>
            {ta?.name ?? "Team A"}
            {isBattingA && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
          </span>
          {inn1 ? (
            <div className="text-right shrink-0">
              <span className={`font-display tabular-nums ${isBattingA ? "text-lg text-foreground" : "text-base text-muted-foreground"}`}>
                {inn1.runs}<span className="text-muted-foreground font-normal">-{inn1.wickets}</span>
              </span>
              {oversStr(inn1) && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">({oversStr(inn1)})</span>}
            </div>
          ) : <span className="text-xs text-muted-foreground italic shrink-0">Yet to bat</span>}
        </div>

        {/* Team B */}
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: tb?.jersey_color || "#1a472a" }}>
            {(tb?.short_name || tb?.name || "B").slice(0, 3).toUpperCase()}
          </span>
          <span className={`flex-1 min-w-0 truncate text-sm font-semibold ${isBattingB ? "text-foreground" : "text-muted-foreground"}`}>
            {tb?.name ?? "Team B"}
            {isBattingB && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />}
          </span>
          {inn2 ? (
            <div className="text-right shrink-0">
              <span className={`font-display tabular-nums ${isBattingB ? "text-lg text-foreground" : "text-base text-muted-foreground"}`}>
                {inn2.runs}<span className="text-muted-foreground font-normal">-{inn2.wickets}</span>
              </span>
              {oversStr(inn2) && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">({oversStr(inn2)})</span>}
            </div>
          ) : <span className="text-xs text-muted-foreground italic shrink-0">Yet to bat</span>}
        </div>
      </div>

      {/* Result / target */}
      {(m.result_text || (m.status === "live" && currentInn?.target)) && (
        <div className="border-t border-border/50 px-4 py-2">
          {m.result_text
            ? <p className="text-xs font-semibold text-primary truncate">{m.result_text}</p>
            : currentInn?.target && <p className="text-xs font-semibold text-primary truncate">Need {Math.max(0, currentInn.target - currentInn.runs)} runs in {Math.max(0, m.overs * 6 - currentInn.balls)} balls</p>
          }
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border/50 flex items-center justify-end px-4 py-2 bg-secondary/20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-primary group-hover:underline">
          {m.status === "live" ? "Score →" : m.status === "completed" ? "Scorecard →" : "View →"}
        </span>
      </div>
    </a>
  );
}

/* ════════════════════════════════════════
   MY MATCHES (logged-in user's matches)
════════════════════════════════════════ */
type MyMatchRow = {
  id: string; status: "scheduled" | "live" | "completed";
  result_text: string | null; overs: number; venue: string | null; created_at: string;
  team_a: { name: string; short_name: string | null; jersey_color: string | null } | null;
  team_b: { name: string; short_name: string | null; jersey_color: string | null } | null;
  innings: { batting_team_id: string; runs: number; wickets: number; balls: number; target: number | null }[];
};

function MyMatches() {
  const [matches, setMatches] = useState<MyMatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("matches")
        .select("id, status, result_text, overs, venue, created_at, team_a:teams!matches_team_a_id_fkey(name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(name, short_name, jersey_color), innings(batting_team_id, runs, wickets, balls, target)")
        .eq("created_by", u.user.id)
        .order("created_at", { ascending: false })
        .limit(4);
      setMatches((data as unknown as MyMatchRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <SectionHeader title="My Matches" sub="Your recent scorecards" icon="📋" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {[0,1,2,3].map((i) => (
          <div key={i} className="h-44 w-72 shrink-0 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </section>
  );

  if (!matches.length) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight">My Matches</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your recent scorecards</p>
          </div>
        </div>
        <Link to="/matches"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary">
          Show all →
        </Link>
      </div>
      {/* Horizontal scrollable row */}
      <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {matches.map((m) => (
          <div key={m.id} className="w-72 shrink-0 sm:w-80">
            <CricMatchCard m={m} />
          </div>
        ))}
        {/* Show all card */}
        <Link to="/matches"
          className="flex w-36 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 text-center transition hover:border-primary/40 hover:bg-card">
          <span className="text-2xl">📋</span>
          <span className="text-xs font-semibold text-primary">View all matches</span>
        </Link>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   HERO LIVE SLIDER
════════════════════════════════════════ */
function HeroLiveSlider() {
  const [rows, setRows] = useState<LiveMatch[]>([]);
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
      setRows((data as unknown as LiveMatch[]) ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (rows.length <= 1) return;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % rows.length), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [rows.length]);

  if (loading) return <div className="mx-auto max-w-3xl h-[200px] animate-pulse rounded-2xl border border-border bg-card" />;

  if (!rows.length) return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center">
      <div className="text-4xl mb-3">🏏</div>
      <p className="text-sm text-muted-foreground">No live matches right now.</p>
      <Link to="/auth" search={{ mode: "register" }}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
        Start a match
      </Link>
    </div>
  );

  const m = rows[idx];
  const lastInn = m.innings?.[m.innings.length - 1] ?? null;
  const firstInn = m.innings?.[0] ?? null;
  const battingTeam = lastInn?.batting_team_id === m.team_a_id ? m.team_a : m.team_b;
  const bowlingTeam = lastInn?.batting_team_id === m.team_a_id ? m.team_b : m.team_a;
  const oversStr = lastInn ? `${Math.floor(lastInn.balls / 6)}.${lastInn.balls % 6}` : "0.0";
  const crr = lastInn && lastInn.balls > 0 ? ((lastInn.runs / lastInn.balls) * 6).toFixed(2) : "—";

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/match/$matchId" params={{ matchId: m.id }}
        className="group relative block rounded-2xl border border-border bg-card p-6 shadow-elevate transition hover:border-primary/30 sm:p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive">
              <Radio className="h-3 w-3 animate-pulse" /> Live
            </span>
            <span className="text-xs text-muted-foreground">T{m.overs}{m.venue ? ` · ${m.venue}` : ""}</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">CRR {crr}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{battingTeam?.name}</div>
            <div className="font-display mt-0.5" style={{ fontSize: "clamp(48px,12vw,72px)", lineHeight: 1 }}>
              <span className="text-[color:var(--gold)]">{lastInn?.runs ?? 0}</span>
              <span className="text-muted-foreground" style={{ fontSize: "60%" }}>/{lastInn?.wickets ?? 0}</span>
            </div>
            <div className="mt-1 font-mono text-sm text-muted-foreground">{oversStr} overs</div>
          </div>
          <div className="hidden text-right sm:block">
            {lastInn?.target ? (
              <>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Need</div>
                <div className="font-display text-3xl text-primary mt-0.5">{Math.max(0, lastInn.target - lastInn.runs)} in {Math.max(0, m.overs * 6 - lastInn.balls)}</div>
              </>
            ) : firstInn && (
              <>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{bowlingTeam?.name}</div>
                <div className="font-display text-xl text-muted-foreground mt-0.5">Yet to bat</div>
              </>
            )}
          </div>
        </div>
        {m.current_innings === 2 && firstInn && (
          <div className="mt-3 text-xs text-muted-foreground">{bowlingTeam?.name} scored <span className="font-mono text-foreground">{firstInn.runs}/{firstInn.wickets}</span></div>
        )}
        <div className="mt-4 text-xs text-primary group-hover:underline">View full scorecard →</div>
      </Link>
      {rows.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button onClick={() => setIdx((i) => (i - 1 + rows.length) % rows.length)} className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {rows.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />)}
          </div>
          <button onClick={() => setIdx((i) => (i + 1) % rows.length)} className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   SHARED UI
════════════════════════════════════════ */
function SectionHeader({ title, sub, icon }: { title: string; sub: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ── Photo-dominant player card (A1/A2) ── */
function colorForPlayer(name: string) {
  const colors = ["#003527", "#9B5DE5", "#3DA9FC", "#E63946", "#06D6A0", "#F15BB5", "#D4AF37", "#FB8500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function PlayerCard({ p, rank, valueLabel }: { p: PlayerStat; rank: number; valueLabel: string }) {
  const isTop3 = rank <= 3;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md transition hover:shadow-xl hover:-translate-y-1">
      {/* Hero photo / avatar fill */}
      {p.avatar ? (
        <img
          src={p.avatar}
          alt={p.name}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ background: `linear-gradient(135deg, ${colorForPlayer(p.name)}, ${colorForPlayer(p.name)}cc)` }}
        >
          <span className="font-display text-7xl text-white/90">{p.name.slice(0, 1).toUpperCase()}</span>
        </div>
      )}

      {/* Top scrim for rank badge legibility */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent" />

      {/* Rank badge */}
      <div className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-bold text-white shadow-sm">
        {medal ?? rank}
      </div>

      {/* Bottom glassmorphism overlay */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pt-10 pb-4">
          <div className="font-display text-lg leading-tight text-white truncate">{p.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            {p.role && (
              <span className="rounded-full bg-white/15 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white/90 border border-white/20">
                {p.role}
              </span>
            )}
            <span className="text-[11px] text-white/70 truncate">{p.team}</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="font-display text-2xl tabular-nums text-white leading-none">{p.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-white/60 mt-0.5">{valueLabel}</div>
            </div>
            {p.wkts !== undefined ? (
              <div className="text-right">
                <div className="font-display text-lg tabular-nums text-white/90 leading-none">{p.wkts}</div>
                <div className="text-[9px] uppercase tracking-wider text-white/60 mt-0.5">Wkts</div>
              </div>
            ) : (
              <div className="text-right">
                <div className="font-display text-lg tabular-nums text-white/90 leading-none">{p.matches}</div>
                <div className="text-[9px] uppercase tracking-wider text-white/60 mt-0.5">Inns</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerSlider({ players, valueLabel, loading }: { players: PlayerStat[]; valueLabel: string; loading: boolean }) {
  if (loading) return (
    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
      {[0,1,2,3,4,5].map((i) => <div key={i} className="aspect-[3/4] w-44 shrink-0 animate-pulse rounded-2xl bg-secondary sm:w-48" />)}
    </div>
  );
  if (!players.length) return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      No data yet — matches played on JustCric will appear here.
    </div>
  );
  return (
    <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
      {players.map((p, i) => (
        <div key={p.id} className="w-44 shrink-0 sm:w-48">
          <PlayerCard p={p} rank={i + 1} valueLabel={valueLabel} />
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════
   BEST PLAYERS (combined batting + bowling)
   Score = runs + wickets*20
════════════════════════════════════════ */
function BestPlayers() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("balls")
        .select("batter_id, bowler_id, batter_name, bowler_name, runs, extra_type, is_wicket, wicket_type, innings_id, team_members!balls_batter_id_fkey(player_name, team_id, role, batting_style, bowling_style, profiles(avatar_url, city, batting_style, bowling_style, role), teams:team_members_team_id_fkey(name))")
        .limit(5000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, any>();

      const ensure = (id: string, name: string, avatar: string | null, team: string, role: string | null, city: string | null, bat: string | null, bowl: string | null) => {
        if (!map.has(id)) map.set(id, { name, avatar, runs: 0, wkts: 0, innings: new Set<string>(), team, role, city, batting_style: bat, bowling_style: bowl });
        return map.get(id);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (row.batter_id) {
          const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
          if (isBat) {
            const r = row.extra_type === "noball" ? row.runs - 1 : row.runs;
            const tm = row.team_members ?? {};
            const prof = tm.profiles ?? {};
            const p = ensure(row.batter_id, tm.player_name ?? row.batter_name ?? "—", prof.avatar_url ?? null, tm.teams?.name ?? "—", prof.role ?? tm.role ?? null, prof.city ?? null, prof.batting_style ?? tm.batting_style ?? null, prof.bowling_style ?? tm.bowling_style ?? null);
            p.runs += r;
            if (row.innings_id) p.innings.add(row.innings_id);
          }
        }
        if (row.bowler_id && row.is_wicket && row.wicket_type !== "runout" && row.wicket_type !== "retired_hurt") {
          const p = map.get(row.bowler_id);
          if (p) p.wkts++;
        }
      });

      const sorted: PlayerStat[] = [...map.entries()]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(([id, v]: [string, any]) => ({
          id, name: v.name, avatar: v.avatar, team: v.team,
          value: v.runs + v.wkts * 20,
          sub: `${v.runs}R ${v.wkts}W`,
          role: v.role, city: v.city,
          batting_style: v.batting_style, bowling_style: v.bowling_style,
          matches: v.innings.size,
          wkts: v.wkts,
          runs: v.runs,
        }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 12);
      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight">Best Players</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Top performers by runs + wickets score</p>
          </div>
        </div>
        <Link to="/best-players"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary">
          View all →
        </Link>
      </div>
      <PlayerSlider players={players} valueLabel="Score" loading={loading} />
    </section>
  );
}

/* ════════════════════════════════════════
   BEST STRIKERS
════════════════════════════════════════ */
function BestStrikers() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("balls")
        .select("batter_id, batter_name, runs, extra_type, team_members!balls_batter_id_fkey(player_name, profiles(avatar_url), teams:team_members_team_id_fkey(name))")
        .not("batter_id", "is", null)
        .limit(5000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, any>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (!row.batter_id) return;
        const tm = row.team_members;
        if (!map.has(row.batter_id)) {
          map.set(row.batter_id, { name: tm?.player_name ?? row.batter_name ?? "—", avatar: tm?.profiles?.avatar_url ?? null, runs: 0, balls: 0, team: tm?.teams?.name ?? "—" });
        }
        const p = map.get(row.batter_id);
        if (row.extra_type !== "wide") p.balls++;
        const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
        if (isBat) { const r = row.extra_type === "noball" ? row.runs - 1 : row.runs; p.runs += r; }
      });

      const sorted: PlayerStat[] = [...map.entries()]
        .filter(([, v]) => v.balls >= 20)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(([id, v]: [string, any]) => ({
          id, name: v.name, avatar: v.avatar, team: v.team,
          value: Math.round((v.runs / v.balls) * 100),
          sub: `${v.runs}R ${v.balls}B`,
          role: null, city: null, batting_style: null, bowling_style: null, matches: 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 9);
      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💥</span>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight">Best Strikers</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Highest strike rate (min. 20 balls faced)</p>
          </div>
        </div>
        <Link to="/best-strikers"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary">
          View all →
        </Link>
      </div>
      <PlayerSlider players={players} valueLabel="SR" loading={loading} />
    </section>
  );
}

/* ════════════════════════════════════════
   MVP LEADERBOARD
════════════════════════════════════════ */
/* ── Ranked-row list for MVP leaderboard (A2) ── */
function MvpRankedList({ players, loading }: { players: PlayerStat[]; loading: boolean }) {
  if (loading) return (
    <div className="space-y-2">
      {[0,1,2,3,4].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />)}
    </div>
  );
  if (!players.length) return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      No MOTM awards yet.
    </div>
  );
  const rankRingColors = ["ring-yellow-400", "ring-slate-400", "ring-amber-600"];
  return (
    <div className="space-y-2">
      {players.map((p, i) => {
        const rank = i + 1;
        const isTop3 = rank <= 3;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
        return (
          <div
            key={p.id}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-3 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
          >
            {/* Avatar with rank badge overlay */}
            <div className="relative shrink-0">
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} className={`h-14 w-14 rounded-full object-cover ${isTop3 ? `ring-2 ring-offset-2 ring-offset-card ${rankRingColors[rank - 1]}` : "border border-border"}`} />
              ) : (
                <div
                  className={`h-14 w-14 grid place-items-center rounded-full font-display text-xl text-white ${isTop3 ? `ring-2 ring-offset-2 ring-offset-card ${rankRingColors[rank - 1]}` : ""}`}
                  style={{ background: colorForPlayer(p.name) }}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-card border border-border text-xs font-bold shadow-sm">
                {medal ?? rank}
              </div>
            </div>

            {/* Name + stats */}
            <div className="min-w-0 flex-1">
              <div className="font-display text-base truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.team}</div>
            </div>

            {/* MOTM count */}
            <div className="text-right shrink-0">
              <div className="font-display text-2xl tabular-nums text-primary leading-none">{p.value}</div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">MOTM</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MVPLeaderboard() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: matches } = await (supabase as any)
        .from("matches")
        .select("motm_player_id")
        .eq("status", "completed")
        .not("motm_player_id", "is", null)
        .limit(1000);

      const map = new Map<string, number>();
      ((matches ?? []) as { motm_player_id: string }[]).forEach((m) => {
        if (m.motm_player_id) map.set(m.motm_player_id, (map.get(m.motm_player_id) ?? 0) + 1);
      });
      if (!map.size) { setLoading(false); return; }

      const { data: mems } = await supabase
        .from("team_members")
        .select("id, player_name, role, batting_style, bowling_style, profiles(avatar_url, city, role, batting_style, bowling_style), teams:team_members_team_id_fkey(name)")
        .in("id", [...map.keys()]);

      const sorted: PlayerStat[] = (mems as any[] ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((mem: any) => ({
          id: mem.id, name: mem.player_name,
          avatar: mem.profiles?.avatar_url ?? null,
          value: map.get(mem.id) ?? 0, sub: "",
          team: mem.teams?.name ?? "—",
          role: mem.profiles?.role ?? mem.role ?? null,
          city: mem.profiles?.city ?? null,
          batting_style: mem.profiles?.batting_style ?? mem.batting_style ?? null,
          bowling_style: mem.profiles?.bowling_style ?? mem.bowling_style ?? null,
          matches: map.get(mem.id) ?? 0,
        }))
        .sort((a: PlayerStat, b: PlayerStat) => b.value - a.value)
        .slice(0, 9);
      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);

  return (
    <section>
      <SectionHeader title="MVP Leaderboard" sub="Most Player of the Match awards" icon="🏆" />
      <MvpRankedList players={players} loading={loading} />
    </section>
  );
}

/* ════════════════════════════════════════
   RECENT PERFORMANCES
════════════════════════════════════════ */
function RecentPerformances() {
  const [perfs, setPerfs] = useState<RecentPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const buildPerfs = async (matches: any[]) => {
    const results: RecentPerf[] = [];
    for (const m of matches) {
      const matchLabel = `${m.team_a?.name ?? "Team A"} vs ${m.team_b?.name ?? "Team B"}`;
      const date = new Date(m.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

      if (m.motm_player_id) {
        const { data: mem } = await supabase.from("team_members")
          .select("id, player_name, profiles(avatar_url)").eq("id", m.motm_player_id).maybeSingle();
        if (mem) {
          const member = mem as any;
          results.push({ id: `motm-${m.id}`, matchLabel, date, playerName: member.player_name, avatar: member.profiles?.avatar_url ?? null, line: `🏆 Player of the Match in ${matchLabel}`, type: "motm" });
        }
      }

      const { data: inningsRows } = await supabase.from("innings").select("id").eq("match_id", m.id);
      const inningsIds = (inningsRows ?? []).map((i: { id: string }) => i.id);
      const { data: balls } = await supabase.from("balls")
        .select("batter_id, batter_name, runs, extra_type, team_members!balls_batter_id_fkey(player_name, profiles(avatar_url))")
        .in("innings_id", inningsIds).not("batter_id", "is", null);

      const batMap = new Map<string, any>();
      (balls as any[] ?? []).forEach((row: any) => {
        if (!row.batter_id) return;
        const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
        if (!isBat) return;
        const r = row.extra_type === "noball" ? row.runs - 1 : row.runs;
        if (!batMap.has(row.batter_id)) batMap.set(row.batter_id, { name: row.team_members?.player_name ?? row.batter_name ?? "—", avatar: row.team_members?.profiles?.avatar_url ?? null, runs: 0 });
        batMap.get(row.batter_id).runs += r;
      });

      const topBat = [...batMap.entries()].sort((a, b) => b[1].runs - a[1].runs)[0];
      if (topBat && topBat[1].runs >= 30) {
        results.push({ id: `bat-${m.id}-${topBat[0]}`, matchLabel, date, playerName: topBat[1].name, avatar: topBat[1].avatar, line: `🏏 ${topBat[1].runs} runs in ${matchLabel}`, type: "bat" });
      }
    }
    return results.slice(0, 12);
  };

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("matches")
        .select("id, completed_at, result_text, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name), motm_player_id")
        .eq("status", "completed")
        .gte("completed_at", since)
        .order("completed_at", { ascending: false })
        .limit(10);

      // C1: fallback to most recent performance regardless of date if nothing in last 24h
      if (recent?.length) {
        const results = await buildPerfs(recent as any[]);
        if (results.length) {
          setPerfs(results);
          setIsFallback(false);
          setLoading(false);
          return;
        }
      }

      const { data: fallback } = await supabase
        .from("matches")
        .select("id, completed_at, result_text, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name), motm_player_id")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(5);

      if (fallback?.length) {
        const results = await buildPerfs(fallback as any[]);
        setPerfs(results);
        setIsFallback(true);
      }
      setLoading(false);
    })();
  }, []);

  // C2: scroll-snap dot indicator tracking
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 256 + 16; // w-64 + gap-4
    setActiveIdx(Math.round(el.scrollLeft / cardWidth));
  };

  return (
    <section>
      <SectionHeader
        title={isFallback ? "Last Performance" : "Recent Performances"}
        sub={isFallback ? "Most recent standout contribution" : "Standout contributions from the last 24 hours"}
        icon="⚡"
      />
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
          {[0,1,2,3,4,5].map((i) => <div key={i} className="h-24 w-64 shrink-0 animate-pulse rounded-2xl border border-border bg-card" />)}
        </div>
      ) : !perfs.length ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No performances yet — play a match to see standout moments here.</div>
      ) : (
        <div className="relative">
          {/* Fade edges to hint scrollability */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-background to-transparent z-10 sm:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-background to-transparent z-10 sm:hidden" />

          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex gap-4 overflow-x-auto pb-3 no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6"
          >
            {perfs.map((p) => (
              <div key={p.id} className={`flex w-64 shrink-0 snap-start items-center gap-3 rounded-2xl border px-4 py-4 shadow-elevate ${p.type === "motm" ? "border-yellow-400/30 bg-yellow-400/5" : "border-border bg-card"}`}>
                {p.avatar ? (
                  <img src={p.avatar} alt={p.playerName} className="h-12 w-12 shrink-0 rounded-2xl object-cover border border-border shadow-sm" />
                ) : (
                  <div className="h-12 w-12 shrink-0 grid place-items-center rounded-2xl bg-primary/15 font-display text-lg text-primary border border-primary/20">
                    {p.playerName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-sm">{p.playerName}</div>
                  <div className="truncate text-xs text-muted-foreground mt-0.5">{p.line}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{p.date}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          {perfs.length > 1 && (
            <div className="mt-2 flex justify-center gap-1.5">
              {perfs.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === activeIdx ? "w-5 bg-primary" : "w-1.5 bg-border"}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}