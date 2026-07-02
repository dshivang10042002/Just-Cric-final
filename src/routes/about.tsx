import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowLeft, Target, Heart, Users2, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — JustCric" },
      {
        name: "description",
        content:
          "JustCric is India's free cricket scoring app — built for local, club, academy and corporate cricket.",
      },
    ],
  }),
  component: AboutPage,
});

const VALUES = [
  {
    icon: Target,
    title: "Built for real cricket",
    desc: "Not a toy scorer — JustCric is designed by people who actually score matches every weekend.",
  },
  {
    icon: Heart,
    title: "Free at launch",
    desc: "Grassroots cricket runs on volunteers and shoestring budgets. Core scoring stays free.",
  },
  {
    icon: Users2,
    title: "Community first",
    desc: "Teams, players and tournaments are all connected — follow, compare and celebrate together.",
  },
  {
    icon: Sparkles,
    title: "Always improving",
    desc: "We ship fast based on feedback from the people actually holding the scorebook.",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mt-6 text-center">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">About JustCric</h1>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
            The free, modern scoring app for the cricket that happens outside the stadiums — on
            maidans, in gully games, at academies and in corporate leagues across India.
          </p>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-8 sm:p-10">
          <h2 className="font-display text-2xl tracking-tight">Our story</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            JustCric started with a simple frustration: keeping score on paper, or in a spreadsheet,
            for a match that everyone cared about. We wanted something that felt as serious as the
            game itself — live ball-by-ball scoring, real stats, and a place for every player's
            numbers to actually mean something — without the cost or complexity built for
            professional broadcasters.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Today JustCric powers club matches, academy sessions, corporate tournaments and
            neighbourhood leagues — turning every over into a scorecard, and every scorecard into a
            stat that follows the player.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg tracking-tight">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">Come score with us</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Free to start, built to grow with your team.
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