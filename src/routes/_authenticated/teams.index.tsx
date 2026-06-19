import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teams/")({
  component: TeamsList,
});

type Team = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  jersey_color: string | null;
};

function TeamsList() {
  const [teams, setTeams] = useState<Team[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("teams")
        .select("id, name, short_name, city, jersey_color")
        .eq("created_by", u.user.id)
        .order("created_at", { ascending: false });
      setTeams((data as Team[]) ?? []);
    })();
  }, []);

  const featured = teams && teams.length > 0 ? teams[0] : null;
  const rest = teams && teams.length > 1 ? teams.slice(1) : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="label-caps text-muted-foreground">Your Squad</div>
            <h1 className="mt-1 font-display text-4xl tracking-tight text-primary sm:text-5xl">
              Teams
            </h1>
          </div>
          <Link
            to="/teams/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> New team
          </Link>
        </div>

        {teams === null ? (
          <div className="mt-10 space-y-4">
            <div className="h-56 animate-pulse rounded-xl border border-border bg-card" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
          </div>
        ) : teams.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-elevate">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-3xl">
              🏏
            </div>
            <h2 className="font-display text-2xl">No teams yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first team to start scoring matches.
            </p>
            <Link
              to="/teams/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95"
            >
              <Plus className="h-4 w-4" /> Create a team
            </Link>
          </div>
        ) : (
          <>
            {/* Hero — featured team */}
            {featured && (
              <section className="mt-8 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-muted/40 p-6 shadow-elevate sm:p-10">
                <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:text-left">
                  <div className="relative h-32 w-32 flex-shrink-0 sm:h-40 sm:w-40">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5" />
                    <div
                      className="relative grid h-full w-full place-items-center rounded-full font-display text-4xl text-white shadow-elevate"
                      style={{ backgroundColor: featured.jersey_color || "#003527" }}
                    >
                      {(featured.short_name || featured.name).slice(0, 3).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-grow space-y-3">
                    <span className="label-caps inline-block rounded-full bg-[color:var(--gold)]/20 px-3 py-1 text-[color:var(--gold-foreground)]">
                      Your Primary Team
                    </span>
                    <h2 className="font-display text-3xl tracking-tight text-primary sm:text-4xl">
                      {featured.name}
                    </h2>
                    <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:mx-0">
                      {featured.city ? `Based in ${featured.city}.` : ""} Manage your squad,
                      jerseys and player roles from here.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2 sm:justify-start">
                      <Link
                        to="/teams/$teamId"
                        params={{ teamId: featured.id }}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110"
                      >
                        <Shield className="h-4 w-4" /> View squad
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Filter chip row (static — all teams) */}
            <div className="no-scrollbar mt-8 flex gap-3 overflow-x-auto pb-2">
              <button className="label-caps flex-shrink-0 rounded-full bg-primary px-5 py-2 text-primary-foreground">
                All Teams
              </button>
            </div>

            {rest.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((t) => (
                  <Link
                    key={t.id}
                    to="/teams/$teamId"
                    params={{ teamId: t.id }}
                    className="group rounded-xl border border-border bg-card p-5 shadow-elevate transition hover:border-primary/30"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-12 w-12 place-items-center rounded-lg font-display text-xl text-white"
                        style={{ backgroundColor: t.jersey_color || "#003527" }}
                      >
                        {(t.short_name || t.name).slice(0, 3).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-display text-xl tracking-tight">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.city || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> View squad
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                Create another team to build out your roster of squads.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
