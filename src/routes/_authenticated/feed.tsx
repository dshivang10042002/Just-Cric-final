import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Rss, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Follow Feed — JustCric" }] }),
  component: FeedPage,
});

type Follow = { entity_type: "team" | "player"; entity_id: string };
type TeamLite = { id: string; name: string; short_name: string | null; jersey_color: string | null };
type MatchItem = {
  id: string;
  status: string;
  scheduled_at: string | null;
  venue: string | null;
  result_text: string | null;
  team_a: TeamLite;
  team_b: TeamLite;
  via: string; // why it's in the feed ("Mumbai Sharks" etc.)
};

function FeedPage() {
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MatchItem[]>([]);
  const [followedTeams, setFollowedTeams] = useState<TeamLite[]>([]);
  const [followedPlayers, setFollowedPlayers] = useState<
    Array<{ id: string; player_name: string; team: TeamLite | null }>
  >([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setMe(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: f } = await supabase
        .from("follows" as never)
        .select("entity_type, entity_id")
        .eq("follower_id", uid);
      const follows = (f as unknown as Follow[]) ?? [];

      const teamIds = follows.filter((x) => x.entity_type === "team").map((x) => x.entity_id);
      const playerIds = follows.filter((x) => x.entity_type === "player").map((x) => x.entity_id);

      // Resolve followed entities for "Who you follow"
      const [{ data: ts }, { data: ps }] = await Promise.all([
        teamIds.length
          ? supabase
              .from("teams")
              .select("id, name, short_name, jersey_color")
              .in("id", teamIds)
          : Promise.resolve({ data: [] as TeamLite[] }),
        playerIds.length
          ? supabase
              .from("team_members")
              .select("id, player_name, team:teams(id, name, short_name, jersey_color)")
              .in("id", playerIds)
          : Promise.resolve({ data: [] }),
      ]);
      setFollowedTeams((ts as TeamLite[]) ?? []);
      setFollowedPlayers((ps as unknown as Array<{ id: string; player_name: string; team: TeamLite | null }>) ?? []);

      // Expand player follows → their team IDs (so we see team matches)
      const playerTeamIds = ((ps as unknown as Array<{ team: TeamLite | null }>) ?? [])
        .map((p) => p.team?.id)
        .filter(Boolean) as string[];
      const allTeamIds = Array.from(new Set([...teamIds, ...playerTeamIds]));

      if (allTeamIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const orFilter = `team_a_id.in.(${allTeamIds.join(",")}),team_b_id.in.(${allTeamIds.join(",")})`;
      const { data: ms } = await supabase
        .from("matches")
        .select(
          "id, status, scheduled_at, venue, result_text, team_a:teams!matches_team_a_id_fkey(id, name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(id, name, short_name, jersey_color)",
        )
        .or(orFilter)
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .limit(40);

      const allTeamIdSet = new Set(allTeamIds);
      const teamNameLookup = new Map<string, string>();
      ((ts as TeamLite[]) ?? []).forEach((t) => teamNameLookup.set(t.id, t.name));
      ((ps as unknown as Array<{ team: TeamLite | null }>) ?? []).forEach((p) => {
        if (p.team) teamNameLookup.set(p.team.id, p.team.name);
      });

      setItems(
        ((ms as unknown as MatchItem[]) ?? []).map((m) => {
          const matchedTeamId = allTeamIdSet.has(m.team_a.id) ? m.team_a.id : m.team_b.id;
          return { ...m, via: teamNameLookup.get(matchedTeamId) ?? "" };
        }),
      );
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-primary" />
          <h1 className="font-display text-4xl tracking-tight">
            Your <span className="text-primary">Feed</span>
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Matches from teams and players you follow.
        </p>

        {!me ? (
          <Empty text="Sign in to start following teams and players." />
        ) : loading ? (
          <div className="mt-6 h-48 animate-pulse rounded-xl border border-border bg-card" />
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_240px]">
            <section>
              {items.length === 0 ? (
                <Empty text="No matches yet from teams or players you follow. Find some on the Teams or Search page and tap Follow." />
              ) : (
                <ul className="space-y-3">
                  {items.map((m) => (
                    <li key={m.id}>
                      <Link
                        to="/match/$matchId"
                        params={{ matchId: m.id }}
                        className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
                      >
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                          <span>via {m.via}</span>
                          <span className="flex items-center gap-1">
                            {m.status === "live" && (
                              <>
                                <Radio className="h-3 w-3 animate-pulse text-destructive" />
                                <span className="text-destructive">Live</span>
                              </>
                            )}
                            {m.status === "completed" && (
                              <>
                                <Trophy className="h-3 w-3 text-primary" />
                                <span>Completed</span>
                              </>
                            )}
                            {m.status === "scheduled" && <span>Scheduled</span>}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-4">
                          <TeamBlock t={m.team_a} />
                          <span className="font-mono text-xs text-muted-foreground">vs</span>
                          <TeamBlock t={m.team_b} right />
                        </div>
                        {m.result_text && (
                          <div className="mt-3 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-foreground">
                            {m.result_text}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="space-y-5">
              <FollowList title="Teams you follow" empty="None yet">
                {followedTeams.map((t) => (
                  <Link
                    key={t.id}
                    to="/teams/$teamId"
                    params={{ teamId: t.id }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                  >
                    <span
                      className="grid h-6 w-6 place-items-center rounded font-display text-[9px] text-white"
                      style={{ backgroundColor: t.jersey_color || "#003527" }}
                    >
                      {(t.short_name || t.name).slice(0, 3).toUpperCase()}
                    </span>
                    <span className="truncate">{t.name}</span>
                  </Link>
                ))}
              </FollowList>
              <FollowList title="Players you follow" empty="None yet">
                {followedPlayers.map((p) => (
                  <Link
                    key={p.id}
                    to="/players/$playerId"
                    params={{ playerId: p.id }}
                    className="flex flex-col rounded-md px-2 py-1.5 text-sm hover:bg-secondary"
                  >
                    <span className="truncate font-medium">{p.player_name}</span>
                    {p.team && (
                      <span className="truncate text-[10px] text-muted-foreground">{p.team.name}</span>
                    )}
                  </Link>
                ))}
              </FollowList>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function TeamBlock({ t, right }: { t: TeamLite; right?: boolean }) {
  return (
    <div className={`flex flex-1 items-center gap-2 ${right ? "flex-row-reverse text-right" : ""}`}>
      <span
        className="grid h-9 w-9 place-items-center rounded-md font-display text-xs text-white"
        style={{ backgroundColor: t.jersey_color || "#003527" }}
      >
        {(t.short_name || t.name).slice(0, 3).toUpperCase()}
      </span>
      <span className="truncate font-display text-lg">{t.name}</span>
    </div>
  );
}

function FollowList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="px-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      {hasChildren ? (
        <div className="space-y-0.5">{children}</div>
      ) : (
        <div className="px-2 py-2 text-xs text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
