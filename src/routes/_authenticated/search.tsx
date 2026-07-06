import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Mic } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — JustCric" }] }),
  component: SearchPage,
});

type TeamRow = { id: string; name: string; short_name: string | null; city: string | null; jersey_color: string | null };
type MatchRow = {
  id: string;
  status: string;
  venue: string | null;
  team_a: { name: string } | null;
  team_b: { name: string } | null;
};
type TourneyRow = { id: string; name: string; format: string; status: string };
type PlayerRow = {
  id: string;
  player_name: string;
  jersey_number: number | null;
  team: { name: string; jersey_color: string | null } | null;
};

function SearchPage() {
  const [q, setQ] = useState("");
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [tourneys, setTourneys] = useState<TourneyRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setTeams([]);
      setMatches([]);
      setTourneys([]);
      setPlayers([]);
      return;
    }
    let active = true;
    setLoading(true);
    const like = `%${term}%`;
    const run = async () => {
      const [t, m, tr, byName, matchedProfiles] = await Promise.all([
        supabase
          .from("teams")
          .select("id, name, short_name, city, jersey_color")
          .or(`name.ilike.${like},short_name.ilike.${like},city.ilike.${like}`)
          .limit(10),
        supabase
          .from("matches")
          .select(
            "id, status, venue, team_a:teams!matches_team_a_id_fkey(name), team_b:teams!matches_team_b_id_fkey(name)",
          )
          .ilike("venue", like)
          .limit(10),
        supabase
          .from("tournaments")
          .select("id, name, format, status")
          .ilike("name", like)
          .limit(10),
        // Matches by the roster name typed when the player joined a team
        supabase
          .from("team_members")
          .select("id, player_name, jersey_number, team:teams(name, jersey_color)")
          .ilike("player_name", like)
          .limit(10),
        // A player's roster name can differ from their account's real name/username
        // (e.g. they joined a team by code and typed a nickname). Also match on the
        // linked profile so search still finds them either way.
        supabase
          .from("profiles")
          .select("id")
          .or(`username.ilike.${like},full_name.ilike.${like}`)
          .limit(10),
      ]);

      let byProfile: { data: PlayerRow[] | null } = { data: [] };
      const profileIds = (matchedProfiles.data ?? []).map((row) => row.id as string);
      if (profileIds.length > 0) {
        byProfile = await supabase
          .from("team_members")
          .select("id, player_name, jersey_number, team:teams(name, jersey_color)")
          .in("profile_id", profileIds)
          .limit(10);
      }

      if (!active) return;
      setTeams((t.data as TeamRow[]) ?? []);
      setMatches((m.data as unknown as MatchRow[]) ?? []);
      setTourneys((tr.data as TourneyRow[]) ?? []);

      const mergedPlayers = new Map<string, PlayerRow>();
      [...((byName.data as PlayerRow[]) ?? []), ...((byProfile.data as PlayerRow[]) ?? [])].forEach((row) => {
        mergedPlayers.set(row.id, row);
      });
      setPlayers(Array.from(mergedPlayers.values()).slice(0, 10));

      setLoading(false);
    };
    const timer = setTimeout(run, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q]);

  const hasResults = teams.length + matches.length + tourneys.length + players.length > 0;
  const term = q.trim();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players, matches, or teams…"
            className="w-full rounded-full border border-border bg-card py-4 pl-12 pr-12 text-base text-foreground shadow-elevate outline-none transition focus:border-primary"
          />
          <Mic className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {term.length > 0 && term.length < 2 && (
          <p className="mt-4 text-xs text-muted-foreground">Type at least 2 characters…</p>
        )}

        {term.length === 0 && (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center shadow-elevate">
            <p className="text-sm text-muted-foreground">
              Search across players, teams, tournaments, and matches by name, city, or venue.
            </p>
          </div>
        )}

        {term.length >= 2 && (
          <div className="mt-6 space-y-8">
            <Section title="Players" empty={!loading && players.length === 0}>
              {players.map((p) => (
                <Link
                  key={p.id}
                  to="/players/$playerId"
                  params={{ playerId: p.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-elevate transition hover:border-primary/30"
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-full font-display text-sm text-white"
                    style={{ backgroundColor: p.team?.jersey_color || "#003527" }}
                  >
                    {p.jersey_number ?? p.player_name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.player_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.team?.name ?? "Free agent"}
                    </div>
                  </div>
                </Link>
              ))}
            </Section>

            <Section title="Teams" empty={!loading && teams.length === 0}>
              {teams.map((t) => (
                <Link
                  key={t.id}
                  to="/teams/$teamId"
                  params={{ teamId: t.id }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-elevate transition hover:border-primary/30"
                >
                  <span
                    className="grid h-10 w-10 place-items-center rounded-lg font-display text-sm text-white"
                    style={{ backgroundColor: t.jersey_color || "#003527" }}
                  >
                    {(t.short_name || t.name).slice(0, 3).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{t.city || "—"}</div>
                  </div>
                </Link>
              ))}
            </Section>

            <Section title="Tournaments" empty={!loading && tourneys.length === 0}>
              {tourneys.map((t) => (
                <Link
                  key={t.id}
                  to="/tournaments/$tournamentId"
                  params={{ tournamentId: t.id }}
                  className="block rounded-xl border border-border bg-card p-3 shadow-elevate transition hover:border-primary/30"
                >
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.format} · {t.status}
                  </div>
                </Link>
              ))}
            </Section>

            <Section title="Matches" empty={!loading && matches.length === 0}>
              {matches.map((m) => (
                <Link
                  key={m.id}
                  to="/match/$matchId"
                  params={{ matchId: m.id }}
                  className="block rounded-xl border border-border bg-card p-3 shadow-elevate transition hover:border-primary/30"
                >
                  <div className="truncate font-medium">
                    {m.team_a?.name ?? "?"} vs {m.team_b?.name ?? "?"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.status}
                    {m.venue ? ` · ${m.venue}` : ""}
                  </div>
                </Link>
              ))}
            </Section>

            {!loading && !hasResults && (
              <p className="text-center text-sm text-muted-foreground">
                No results for &ldquo;{term}&rdquo;
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (empty) return null;
  return (
    <section>
      <h2 className="label-caps mb-2 text-muted-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}