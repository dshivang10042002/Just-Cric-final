import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import {
  ArrowLeft,
  Radio,
  Users,
  Trophy,
  BarChart3,
  TrendingUp,
  Rss,
  ShieldCheck,
  Smartphone,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — JustCric" },
      {
        name: "description",
        content:
          "Everything JustCric gives you: live ball-by-ball scoring, team management, tournaments, leaderboards and player KPIs — free.",
      },
    ],
  }),
  component: FeaturesPage,
});

const FEATURES = [
  {
    icon: Radio,
    title: "Live ball-by-ball scoring",
    desc: "Score every delivery in real time — runs, extras, wickets and overs update instantly for everyone watching.",
  },
  {
    icon: Users,
    title: "Teams & squads",
    desc: "Build teams, manage squads, add players by phone invite, link or QR code, and hand off scoring to a co-scorer.",
  },
  {
    icon: Trophy,
    title: "Tournaments",
    desc: "Run knockouts and leagues with fixtures, standings and match results all in one place.",
  },
  {
    icon: BarChart3,
    title: "Leaderboards",
    desc: "Best batters, best bowlers, MVPs — auto-ranked from real match data, no spreadsheets required.",
  },
  {
    icon: TrendingUp,
    title: "Player KPIs",
    desc: "Personal stats dashboards with radar charts, trends over time, and match-by-match breakdowns.",
  },
  {
    icon: Rss,
    title: "Follow & feed",
    desc: "Follow your favourite teams and players to get a feed of their latest scores and performances.",
  },
  {
    icon: ShieldCheck,
    title: "Built for real matches",
    desc: "Handles wides, no-balls, retirements, DLS-style edge cases and multi-innings formats.",
  },
  {
    icon: Smartphone,
    title: "Works on any device",
    desc: "No app install needed — score from the ground on your phone, tablet or laptop.",
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mt-6 text-center">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            Everything you need to score cricket
          </h1>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
            From a weekend gully match to a full club tournament — JustCric handles the scoring, the
            stats and the bragging rights.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 shadow-elevate transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">
            Ready to start scoring?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            It takes less than a minute to create your first match.
          </p>
          <div className="mt-6">
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition active:scale-95 hover:brightness-110 glow-primary"
            >
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}