import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
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
    links: [
      { rel: "canonical", href: "https://justcric.in/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "@id": "https://justcric.in/#website", "url": "https://justcric.in/", "name": "JustCric", "description": "Free cricket scoring app for India." },
            { "@type": "SoftwareApplication", "name": "JustCric", "operatingSystem": "Web", "applicationCategory": "SportsApplication", "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" } },
          ],
        }),
      },
    ],
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
  matches: number;
};
type RecentPerf = { id: string; matchLabel: string; date: string; playerName: string; avatar: string | null; line: string; type: "bat" | "bowl" | "motm" };
 
/* ─── Map value shape used across stat sections ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StatMapValue = Record<string, any>;
 
/* ════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════ */
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
              <a href="#live" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3.5 text-base font-semibold transition active:scale-95 hover:bg-secondary">
                View Live Matches
              </a>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">Free forever · No credit card · Built for grassroots cricket</p>
          </div>
 
          {/* Live match slider */}
          <div className="mt-16" id="live">
            <HeroLiveSlider />
          </div>
        </div>
      </section>
 
      {/* ── Stats sections ── */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 space-y-16">
        <TopBatters />
        <TopBowlers />
        <BestAllRounders />
        <BestStrikers />
        <MVPLeaderboard />
        <RecentPerformances />
      </div>
 
      {/* ── Pricing ── */}
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
 
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div><span className="font-display text-lg text-primary">JustCric</span> · © {new Date().getFullYear()}</div>
          <div className="flex gap-5">
            <a href="#live" className="hover:text-primary">Live</a>
            <a href="#pricing" className="hover:text-primary">Pricing</a>
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
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
 
function PlayerCard({ p, rank, valueLabel }: { p: PlayerStat; rank: number; valueLabel: string }) {
  const rankColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];
  const rankBg = ["bg-yellow-400/10 border-yellow-400/30", "bg-slate-400/10 border-slate-400/30", "bg-amber-600/10 border-amber-600/30"];
  const isTop3 = rank <= 3;
 
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-card transition hover:shadow-lg hover:-translate-y-0.5 ${isTop3 ? rankBg[rank - 1] : "border-border hover:border-primary/30"}`}>
      {/* Rank badge */}
      <div className={`absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${isTop3 ? rankBg[rank - 1] + " " + rankColors[rank - 1] : "border-border bg-secondary text-muted-foreground"}`}>
        {rank}
      </div>
 
      {/* Top section — avatar + name */}
      <div className="flex items-center gap-4 p-4 pb-3">
        <div className="relative shrink-0">
          {p.avatar ? (
            <img src={p.avatar} alt={p.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-border shadow-md" />
          ) : (
            <div className="h-16 w-16 rounded-2xl grid place-items-center bg-primary/15 border-2 border-primary/20 shadow-md">
              <span className="font-display text-2xl text-primary">{p.name.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
          {isTop3 && (
            <div className={`absolute -bottom-1.5 -right-1.5 text-base`}>
              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <div className="font-display text-lg truncate leading-tight">{p.name}</div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">{p.team}</div>
          {p.city && <div className="text-[10px] text-muted-foreground/70 mt-0.5">📍 {p.city}</div>}
        </div>
      </div>
 
      {/* Stats row */}
      <div className="border-t border-border/50 grid grid-cols-3 divide-x divide-border/50">
        <div className="px-3 py-2.5 text-center">
          <div className={`font-display text-xl tabular-nums ${isTop3 ? rankColors[rank - 1] : "text-primary"}`}>{p.value}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{valueLabel}</div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="font-display text-xl tabular-nums text-foreground">{p.matches}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Matches</div>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="text-[10px] font-semibold text-foreground truncate mt-1">{p.role ?? "—"}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Role</div>
        </div>
      </div>
 
      {/* Style tags */}
      {(p.batting_style || p.bowling_style) && (
        <div className="border-t border-border/50 px-3 py-2 flex flex-wrap gap-1.5">
          {p.batting_style && (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
              🏏 {p.batting_style}
            </span>
          )}
          {p.bowling_style && (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
              🎳 {p.bowling_style}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
 
function PlayerGrid({ players, valueLabel, loading }: { players: PlayerStat[]; valueLabel: string; loading: boolean }) {
  if (loading) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-border bg-card" />)}
    </div>
  );
  if (!players.length) return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      No data yet — matches played on JustCric will appear here.
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((p, i) => <PlayerCard key={p.id} p={p} rank={i + 1} valueLabel={valueLabel} />)}
    </div>
  );
}
 
/* ════════════════════════════════════════
   TOP BATTERS
════════════════════════════════════════ */
function TopBatters() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("balls")
        .select("batter_id, batter_name, runs, extra_type, innings_id, team_members!balls_batter_id_fkey(player_name, team_id, role, batting_style, bowling_style, profiles(avatar_url, city, batting_style, bowling_style, role), teams:team_members_team_id_fkey(name))")
        .not("batter_id", "is", null)
        .limit(5000);
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, StatMapValue>();
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (!row.batter_id) return;
        const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
        if (!isBat) return;
        const r = row.extra_type === "noball" ? row.runs - 1 : row.runs;
        const tm = row.team_members;
        const existing: StatMapValue = map.get(row.batter_id) ?? {
          name: tm?.player_name ?? row.batter_name ?? "Unknown",
          avatar: tm?.profiles?.avatar_url ?? null,
          runs: 0,
          innings: new Set<string>(),
          team: tm?.teams?.name ?? "—",
          role: tm?.profiles?.role ?? tm?.role ?? null,
          city: tm?.profiles?.city ?? null,
          batting_style: tm?.profiles?.batting_style ?? tm?.batting_style ?? null,
          bowling_style: tm?.profiles?.bowling_style ?? tm?.bowling_style ?? null,
        };
        existing.runs += r;
        existing.innings.add(row.innings_id ?? "");
        map.set(row.batter_id, existing);
      });
 
      const sorted = [...map.entries()]
        .sort((a, b) => b[1].runs - a[1].runs)
        .slice(0, 9)
        .map(([id, v]) => ({
          id, name: v.name, avatar: v.avatar,
          value: v.runs, sub: `${v.runs} runs`,
          team: v.team, role: v.role, city: v.city,
          batting_style: v.batting_style, bowling_style: v.bowling_style,
          matches: (v.innings as Set<string>).size,
        }));
      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);
 
  return (
    <section>
      <SectionHeader title="Famous Batters" sub="Most runs scored on JustCric" icon="🏏" />
      <PlayerGrid players={players} valueLabel="Runs" loading={loading} />
    </section>
  );
}
 
/* ════════════════════════════════════════
   TOP BOWLERS
════════════════════════════════════════ */
function TopBowlers() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("balls")
        .select("bowler_id, bowler_name, is_wicket, wicket_type, innings_id, team_members!balls_bowler_id_fkey(player_name, team_id, role, batting_style, bowling_style, profiles(avatar_url, city, batting_style, bowling_style, role), teams:team_members_team_id_fkey(name))")
        .eq("is_wicket", true)
        .not("bowler_id", "is", null)
        .limit(5000);
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, StatMapValue>();
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (!row.bowler_id) return;
        if (row.wicket_type === "runout" || row.wicket_type === "retired_hurt") return;
        const tm = row.team_members;
        const existing: StatMapValue = map.get(row.bowler_id) ?? {
          name: tm?.player_name ?? row.bowler_name ?? "Unknown",
          avatar: tm?.profiles?.avatar_url ?? null,
          wkts: 0,
          innings: new Set<string>(),
          team: tm?.teams?.name ?? "—",
          role: tm?.profiles?.role ?? tm?.role ?? null,
          city: tm?.profiles?.city ?? null,
          batting_style: tm?.profiles?.batting_style ?? tm?.batting_style ?? null,
          bowling_style: tm?.profiles?.bowling_style ?? tm?.bowling_style ?? null,
        };
        existing.wkts++;
        existing.innings.add(row.innings_id ?? "");
        map.set(row.bowler_id, existing);
      });
 
      const sorted = [...map.entries()]
        .sort((a, b) => b[1].wkts - a[1].wkts)
        .slice(0, 9)
        .map(([id, v]) => ({
          id, name: v.name, avatar: v.avatar,
          value: v.wkts, sub: `${v.wkts} wickets`,
          team: v.team, role: v.role, city: v.city,
          batting_style: v.batting_style, bowling_style: v.bowling_style,
          matches: (v.innings as Set<string>).size,
        }));
      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);
 
  return (
    <section>
      <SectionHeader title="Famous Bowlers" sub="Most wickets taken on JustCric" icon="🎳" />
      <PlayerGrid players={players} valueLabel="Wickets" loading={loading} />
    </section>
  );
}
 
/* ════════════════════════════════════════
   BEST ALL ROUNDERS
   Score = runs + (wickets * 20)
════════════════════════════════════════ */
function BestAllRounders() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("balls")
        .select("batter_id, bowler_id, batter_name, bowler_name, runs, extra_type, is_wicket, wicket_type, team_members!balls_batter_id_fkey(player_name, profiles(avatar_url), teams:team_members_team_id_fkey(name))")
        .limit(5000);
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map<string, StatMapValue>();
 
      const ensure = (id: string, name: string, avatar: string | null, team: string): StatMapValue => {
        if (!map.has(id)) map.set(id, { name, avatar, runs: 0, wkts: 0, team });
        return map.get(id)!;
      };
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (row.batter_id) {
          const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
          if (isBat) {
            const r = row.extra_type === "noball" ? row.runs - 1 : row.runs;
            const tm = row.team_members;
            const p = ensure(row.batter_id, tm?.player_name ?? row.batter_name ?? "—", tm?.profiles?.avatar_url ?? null, tm?.teams?.name ?? "—");
            p.runs += r;
          }
        }
        if (row.bowler_id && row.is_wicket && row.wicket_type !== "runout" && row.wicket_type !== "retired_hurt") {
          const p = map.get(row.bowler_id);
          if (p) p.wkts++;
        }
      });
 
      const sorted = [...map.entries()]
        .map(([id, v]) => ({
          id, name: v.name, avatar: v.avatar, team: v.team,
          value: v.runs + v.wkts * 20,
          sub: `${v.runs}R ${v.wkts}W`,
          role: null, city: null, batting_style: null, bowling_style: null, matches: 0,
        }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 9);
      setPlayers(sorted);
      setLoading(false);
    })();
  }, []);
 
  return (
    <section>
      <SectionHeader title="Best All Rounders" sub="Runs + (Wickets × 20) combined score" icon="⚡" />
      <PlayerGrid players={players} valueLabel="Score" loading={loading} />
    </section>
  );
}
 
/* ════════════════════════════════════════
   BEST STRIKERS (Strike Rate min 20 balls)
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
      const map = new Map<string, StatMapValue>();
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any[] ?? []).forEach((row: any) => {
        if (!row.batter_id) return;
        const tm = row.team_members;
        const p: StatMapValue = map.get(row.batter_id) ?? {
          name: tm?.player_name ?? row.batter_name ?? "—",
          avatar: tm?.profiles?.avatar_url ?? null,
          runs: 0, balls: 0,
          team: tm?.teams?.name ?? "—",
        };
        if (row.extra_type !== "wide") p.balls++;
        const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
        if (isBat) { const r = row.extra_type === "noball" ? row.runs - 1 : row.runs; p.runs += r; }
        map.set(row.batter_id, p);
      });
 
      const sorted = [...map.entries()]
        .filter(([, v]) => v.balls >= 20)
        .map(([id, v]) => ({
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
      <SectionHeader title="Best Strikers" sub="Highest strike rate (min. 20 balls faced)" icon="💥" />
      <PlayerGrid players={players} valueLabel="SR" loading={loading} />
    </section>
  );
}
 
/* ════════════════════════════════════════
   MVP — Most MOTM awards
════════════════════════════════════════ */
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
 
      const ids = [...map.keys()];
      const { data: mems } = await supabase
        .from("team_members")
        .select("id, player_name, role, batting_style, bowling_style, profiles(avatar_url, city, role, batting_style, bowling_style), teams:team_members_team_id_fkey(name)")
        .in("id", ids);
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sorted = (mems as any[] ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((mem: any) => ({
          id: mem.id,
          name: mem.player_name,
          avatar: mem.profiles?.avatar_url ?? null,
          value: map.get(mem.id) ?? 0,
          sub: "",
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
      <PlayerGrid players={players} valueLabel="MOTM" loading={loading} />
    </section>
  );
}
 
/* ════════════════════════════════════════
   RECENT PERFORMANCES (last 24h)
════════════════════════════════════════ */
function RecentPerformances() {
  const [perfs, setPerfs] = useState<RecentPerf[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
 
      const { data: matches } = await supabase
        .from("matches")
        .select("id, completed_at, result_text, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name), motm_player_id")
        .eq("status", "completed")
        .gte("completed_at", since)
        .order("completed_at", { ascending: false })
        .limit(10);
 
      if (!matches?.length) { setLoading(false); return; }
 
      const results: RecentPerf[] = [];
 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const m of matches as any[]) {
        const matchLabel = `${m.team_a?.name ?? "Team A"} vs ${m.team_b?.name ?? "Team B"}`;
        const date = new Date(m.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
 
        // MOTM
        if (m.motm_player_id) {
          const { data: mem } = await supabase.from("team_members")
            .select("id, player_name, profiles(avatar_url)").eq("id", m.motm_player_id).maybeSingle();
          if (mem) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const member = mem as any;
            results.push({
              id: `motm-${m.id}`, matchLabel, date,
              playerName: member.player_name,
              avatar: member.profiles?.avatar_url ?? null,
              line: `🏆 Player of the Match in ${matchLabel}`,
              type: "motm",
            });
          }
        }
 
        // Top batter of this match
        const { data: inningsRows } = await supabase.from("innings").select("id").eq("match_id", m.id);
        const inningsIds = (inningsRows ?? []).map((i: { id: string }) => i.id);
 
        const { data: balls } = await supabase.from("balls")
          .select("batter_id, batter_name, runs, extra_type, team_members!balls_batter_id_fkey(player_name, profiles(avatar_url))")
          .in("innings_id", inningsIds)
          .not("batter_id", "is", null);
 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batMap = new Map<string, StatMapValue>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (balls as any[] ?? []).forEach((row: any) => {
          if (!row.batter_id) return;
          const isBat = row.extra_type !== "wide" && row.extra_type !== "bye" && row.extra_type !== "legbye";
          if (!isBat) return;
          const r = row.extra_type === "noball" ? row.runs - 1 : row.runs;
          const p: StatMapValue = batMap.get(row.batter_id) ?? {
            name: row.team_members?.player_name ?? row.batter_name ?? "—",
            avatar: row.team_members?.profiles?.avatar_url ?? null,
            runs: 0,
          };
          p.runs += r;
          batMap.set(row.batter_id, p);
        });
 
        const topBat = [...batMap.entries()].sort((a, b) => b[1].runs - a[1].runs)[0];
        if (topBat && topBat[1].runs >= 30) {
          results.push({
            id: `bat-${m.id}-${topBat[0]}`, matchLabel, date,
            playerName: topBat[1].name,
            avatar: topBat[1].avatar,
            line: `🏏 ${topBat[1].runs} runs in ${matchLabel}`,
            type: "bat",
          });
        }
      }
 
      setPerfs(results.slice(0, 12));
      setLoading(false);
    })();
  }, []);
 
  return (
    <section>
      <SectionHeader title="Recent Performances" sub="Standout contributions from the last 24 hours" icon="⚡" />
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />)}
        </div>
      ) : !perfs.length ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No recent performances in the last 24 hours.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perfs.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${p.type === "motm" ? "border-yellow-400/30 bg-yellow-400/5" : "border-border bg-card"}`}>
              {p.avatar ? (
                <img src={p.avatar} alt={p.playerName} className="h-10 w-10 shrink-0 rounded-full object-cover border border-border" />
              ) : (
                <div className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-primary/15 font-display text-base text-primary">
                  {p.playerName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-sm">{p.playerName}</div>
                <div className="truncate text-xs text-muted-foreground">{p.line}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{p.date}</div>
              </div>
            </div>
          ))}
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