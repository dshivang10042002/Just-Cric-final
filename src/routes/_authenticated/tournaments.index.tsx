import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Plus, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tournaments/")({
  component: TournamentsList,
});

type Tournament = {
  id: string;
  name: string;
  short_name: string | null;
  format: string;
  overs_per_match: number;
  status: string;
  start_date: string | null;
};

function TournamentsList() {
  const [items, setItems] = useState<Tournament[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("tournaments")
        .select("id, name, short_name, format, overs_per_match, status, start_date")
        .eq("created_by", u.user.id)
        .order("created_at", { ascending: false });
      setItems((data as Tournament[]) ?? []);
    })();
  }, []);

  const live = items?.find((t) => t.status === "live") ?? null;
  const others = items ? items.filter((t) => t.id !== live?.id) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-caps text-muted-foreground">Elite Hub</div>
            <h1 className="mt-1 font-display text-4xl tracking-tight text-primary sm:text-5xl">
              Championship Series
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items === null ? "Loading…" : `${items.length} tournament${items.length === 1 ? "" : "s"}`} ·
              Run leagues, generate fixtures, track the table.
            </p>
          </div>
          <Link
            to="/tournaments/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Create League
          </Link>
        </div>

        {items === null ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-elevate">
            <Trophy className="mx-auto h-10 w-10 text-[color:var(--gold)]" />
            <p className="mt-3 font-display text-2xl">No tournaments yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Spin one up — round-robin fixtures will be generated for you.
            </p>
            <Link
              to="/tournaments/new"
              className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              + Create tournament
            </Link>
          </div>
        ) : (
          <>
            {/* Featured / live tournament hero */}
            {live && (
              <Link
                to="/tournaments/$tournamentId"
                params={{ tournamentId: live.id }}
                className="group mt-8 block overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary to-[#0b513d] p-7 text-primary-foreground shadow-elevate transition hover:-translate-y-0.5 sm:p-9"
              >
                <span className="label-caps inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Live Now
                </span>
                <h2 className="mt-4 font-display text-3xl tracking-tight sm:text-4xl">{live.name}</h2>
                <p className="mt-2 max-w-xl text-sm text-primary-foreground/70">
                  {live.format.toUpperCase()} format · {live.overs_per_match} overs per match
                  {live.start_date ? ` · started ${live.start_date}` : ""}
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[color:var(--gold)]">
                  View live table <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            )}

            <div className="mt-8 flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-tight">
                {live ? "All Tournaments" : "Your Tournaments"}
              </h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {others.map((t) => (
                <Link
                  key={t.id}
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: t.id }}
                  className="group rounded-xl border border-border bg-card p-5 shadow-elevate transition hover:border-primary/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-2xl tracking-tight group-hover:text-primary">
                      {t.name}
                    </span>
                    <span
                      className={`label-caps rounded-full px-2 py-0.5 text-[10px] ${
                        t.status === "live"
                          ? "bg-destructive/15 text-destructive"
                          : t.status === "completed"
                            ? "bg-secondary text-muted-foreground"
                            : "bg-primary/10 text-primary"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {t.format.toUpperCase()} · {t.overs_per_match} overs
                    {t.start_date ? ` · ${t.start_date}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
