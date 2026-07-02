import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowLeft, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — JustCric" },
      {
        name: "description",
        content:
          "JustCric is free at launch — unlimited matches, scorecards, 3 teams and 2 tournaments, forever free.",
      },
    ],
  }),
  component: PricingPage,
});

const INCLUDED = [
  "Unlimited live-scored matches",
  "Ball-by-ball scorecards & full match history",
  "Up to 3 teams with squads",
  "Up to 2 tournaments",
  "Player KPIs, leaderboards & rankings",
  "Follow teams & players, community feed",
  "Co-scorer support for any match",
  "Works on mobile, tablet and desktop — no install",
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="mt-6 text-center">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Free at launch</h1>
          <p className="mt-3 max-w-md mx-auto text-muted-foreground">
            No credit card, no trial countdown. Everything below is free while JustCric is in launch
            mode.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-elevate">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-display text-5xl tracking-tight">₹0</span>
            <span className="text-sm text-muted-foreground">/ forever, for now</span>
          </div>

          <ul className="mt-8 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 text-center">
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 font-bold text-primary-foreground transition active:scale-95 hover:brightness-110 glow-primary"
            >
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need more teams, tournaments or organisation-level tools?{" "}
          <Link to="/contact" className="font-semibold text-primary hover:underline">
            Get in touch
          </Link>{" "}
          — we're building JustCric around what real teams need.
        </p>
      </div>
    </div>
  );
}