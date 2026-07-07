import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { TeamLogoUpload } from "@/components/TeamLogoUpload";
import { TeamMatchCard, type TeamMatchRow } from "@/components/TeamMatchCard";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  Link2,
  MapPin,
  Phone,
  QrCode,
  Star,
  Trash2,
  UserPlus,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/teams/$teamId")({
  component: TeamDetail,
});

type Team = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  jersey_color: string | null;
  logo_url: string | null;
  created_by: string;
  join_code: string | null;
};
type Member = {
  id: string;
  player_name: string;
  jersey_number: number | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
  profile_id: string | null;
  profile: { avatar_url: string | null } | null;
};
type BallRow = {
  runs: number;
  extra_type: string | null;
  is_wicket: boolean;
  wicket_type: string | null;
  batter_id: string | null;
  bowler_id: string | null;
};
type GlobalMatchRow = {
  status: string;
  winner_team_id: string | null;
  team_a_id: string;
  team_b_id: string;
};
type GlobalTeamRow = { id: string; name: string; city: string | null };
type BestPlayer = { member: Member; runs: number; wickets: number };

const ROLES = ["Batter", "Bowler", "All-rounder", "WK"];
type Tab = "phone" | "link" | "qr";

function TeamDetail() {
  const { teamId } = Route.useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState<TeamMatchRow[]>([]);
  const [playerStats, setPlayerStats] = useState<
    Map<string, { runs: number; fours: number; sixes: number; wickets: number }>
  >(new Map());
  const [rank, setRank] = useState<{ overall: number | null; overallOf: number; city: number | null; cityOf: number }>(
    { overall: null, overallOf: 0, city: null, cityOf: 0 },
  );

  const scrollerRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<Tab>("phone");
  const [phone, setPhone] = useState("");
  const [pnum, setPnum] = useState("");
  const [prole, setProle] = useState(ROLES[0]);
  const [adding, setAdding] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined" || !team?.join_code) return "";
    return `${window.location.origin}/join-team?code=${team.join_code}`;
  }, [team?.join_code]);

  useEffect(() => {
    if (tab !== "qr" || !inviteUrl) return;
    QRCode.toDataURL(inviteUrl, { width: 320, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [tab, inviteUrl]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);

    const { data: t } = await supabase
      .from("teams")
      .select("id, name, short_name, city, jersey_color, logo_url, created_by, join_code")
      .eq("id", teamId)
      .maybeSingle();
    setTeam((t as Team) ?? null);

    const { data: m } = await supabase
      .from("team_members")
      .select(
        "id, player_name, jersey_number, role, batting_style, bowling_style, profile_id, profile:profiles(avatar_url)",
      )
      .eq("team_id", teamId)
      .order("jersey_number", { ascending: true, nullsFirst: false });
    const memberRows = (m as unknown as Member[]) ?? [];
    setMembers(memberRows);

    const { data: ms } = await supabase
      .from("matches")
      .select(
        "id, overs, venue, status, result_text, created_at, winner_team_id, team_a_id, team_b_id, team_a:teams!matches_team_a_id_fkey(name, short_name, jersey_color), team_b:teams!matches_team_b_id_fkey(name, short_name, jersey_color), innings(batting_team_id, runs, wickets, balls)",
      )
      .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
      .order("created_at", { ascending: false });
    setMatches((ms as unknown as TeamMatchRow[]) ?? []);

    const memberIds = memberRows.map((r) => r.id);
    const statsMap = new Map<string, { runs: number; fours: number; sixes: number; wickets: number }>();
    memberIds.forEach((id) => statsMap.set(id, { runs: 0, fours: 0, sixes: 0, wickets: 0 }));
    if (memberIds.length > 0) {
      const idList = memberIds.join(",");
      const { data: balls } = await supabase
        .from("balls")
        .select("runs, extra_type, is_wicket, wicket_type, batter_id, bowler_id")
        .or(`batter_id.in.(${idList}),bowler_id.in.(${idList})`);
      ((balls as BallRow[]) ?? []).forEach((b) => {
        if (b.batter_id && statsMap.has(b.batter_id)) {
          const isBatRun = b.extra_type !== "wide" && b.extra_type !== "bye" && b.extra_type !== "legbye";
          if (isBatRun) {
            const row = statsMap.get(b.batter_id)!;
            const r = b.extra_type === "noball" ? b.runs - 1 : b.runs;
            row.runs += r;
            if (r === 4) row.fours++;
            if (r === 6) row.sixes++;
          }
        }
        if (b.bowler_id && statsMap.has(b.bowler_id) && b.is_wicket && b.wicket_type !== "runout") {
          statsMap.get(b.bowler_id)!.wickets++;
        }
      });
    }
    setPlayerStats(statsMap);

    const [{ data: allTeams }, { data: allMatches }] = await Promise.all([
      supabase.from("teams").select("id, name, city"),
      supabase.from("matches").select("status, winner_team_id, team_a_id, team_b_id").eq("status", "completed"),
    ]);
    const teamRows = (allTeams as GlobalTeamRow[]) ?? [];
    const matchRows = (allMatches as GlobalMatchRow[]) ?? [];
    const agg = new Map<string, { team: GlobalTeamRow; played: number; wins: number }>();
    teamRows.forEach((tr) => agg.set(tr.id, { team: tr, played: 0, wins: 0 }));
    matchRows.forEach((mr) => {
      [mr.team_a_id, mr.team_b_id].forEach((tid) => {
        const a = agg.get(tid);
        if (!a) return;
        a.played++;
        if (mr.winner_team_id === tid) a.wins++;
      });
    });
    const sortFn = (x: { team: GlobalTeamRow; played: number; wins: number }, y: typeof x) =>
      y.played - x.played || y.wins - x.wins || x.team.name.localeCompare(y.team.name);
    const overallRanked = [...agg.values()].filter((a) => a.played > 0).sort(sortFn);
    const overallIdx = overallRanked.findIndex((a) => a.team.id === teamId);
    const myCity = (t as Team | null)?.city?.trim();
    let cityRanked: typeof overallRanked = [];
    if (myCity) {
      cityRanked = overallRanked.filter((a) => (a.team.city ?? "").trim() === myCity);
    }
    const cityIdx = myCity ? cityRanked.findIndex((a) => a.team.id === teamId) : -1;
    setRank({
      overall: overallIdx >= 0 ? overallIdx + 1 : null,
      overallOf: overallRanked.length,
      city: cityIdx >= 0 ? cityIdx + 1 : null,
      cityOf: cityRanked.length,
    });

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const addByPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/[^0-9+]/g, "");
    if (clean.replace(/\D/g, "").length < 6) return toast.error("Enter a valid phone number");
    setAdding(true);
    const { error } = await supabase.rpc(
      "add_team_member_by_phone" as never,
      {
        p_team_id: teamId,
        p_phone: clean,
        p_jersey: pnum.trim() ? parseInt(pnum, 10) : null,
        p_role: prole,
      } as never,
    );
    setAdding(false);
    if (error) {
      const code = error.message || "";
      if (code.includes("phone_not_found")) {
        toast.error("No player with that phone is registered yet. Share the link or QR instead.");
        setTab("link");
      } else if (code.includes("already_member")) {
        toast.error("That player is already in this team");
      } else if (code.includes("not_owner")) {
        toast.error("Only the team captain can add players");
      } else if (code.includes("invalid_phone")) {
        toast.error("Phone number looks invalid");
      } else {
        toast.error(code);
      }
      return;
    }
    setPhone("");
    setPnum("");
    toast.success("Player added 🏏");
    load();
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setMembers((prev) => prev.filter((x) => x.id !== id));
  };

  const deleteTeam = async () => {
    if (!confirm("Delete this team and all its players?")) return;
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) return toast.error(error.message);
    toast.success("Team deleted");
    navigate({ to: "/teams" });
  };

  const copy = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const shareLink = async () => {
    if (!inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${team?.name ?? "our team"} on JustCric`,
          text: `You're invited to join ${team?.name}. Tap to join:`,
          url: inviteUrl,
        });
        return;
      } catch {
        /* user dismissed */
      }
    }
    copy(inviteUrl, "Invite link copied");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="h-32 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6">
          <h1 className="font-display text-3xl">Team not found</h1>
          <Link to="/teams" className="mt-4 inline-block text-primary hover:underline">
            Back to teams
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = me === team.created_by;

  const completed = matches.filter((m) => m.status === "completed");
  const played = completed.length;
  const wins = completed.filter((m) => m.winner_team_id === teamId).length;
  const losses = completed.filter((m) => m.winner_team_id && m.winner_team_id !== teamId).length;
  const winPct = played > 0 ? (wins / played) * 100 : 0;
  const recentMatches = matches.slice(0, 10);

  let totalRuns = 0;
  let totalFours = 0;
  let totalSixes = 0;
  let totalWickets = 0;
  let bestPlayer: BestPlayer | null = null;
  let bestScore = -1;
  members.forEach((mem) => {
    const s = playerStats.get(mem.id);
    if (!s) return;
    totalRuns += s.runs;
    totalFours += s.fours;
    totalSixes += s.sixes;
    totalWickets += s.wickets;
    const score = s.runs + s.wickets * 20;
    if ((s.runs > 0 || s.wickets > 0) && score > bestScore) {
      bestScore = score;
      bestPlayer = { member: mem, runs: s.runs, wickets: s.wickets };
    }
  });

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          to="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All teams
        </Link>

        <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-elevate">
          <div className="flex items-start gap-4">
            {isOwner ? (
              <TeamLogoUpload
                teamId={team.id}
                logoUrl={team.logo_url}
                onUploaded={(url) => setTeam((t) => (t ? { ...t, logo_url: url } : t))}
              />
            ) : team.logo_url ? (
              <img src={team.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            ) : (
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-xl font-display text-xl text-white"
                style={{ backgroundColor: team.jersey_color || "#003527" }}
              >
                {(team.short_name || team.name).slice(0, 3).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl tracking-tight text-primary sm:text-4xl">{team.name}</h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {team.city || "—"} · {members.length} player
                {members.length === 1 ? "" : "s"}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <FollowButton entityType="team" entityId={team.id} size="sm" />
                {isOwner && (
                  <button
                    onClick={deleteTeam}
                    className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete team
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-elevate">
          <h2 className="font-display text-xl tracking-tight">Record</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Played" v={played} />
            <Stat label="Won" v={wins} accent />
            <Stat label="Lost" v={losses} />
            <Stat label="Win %" v={played > 0 ? `${winPct.toFixed(0)}%` : "—"} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">City rank</p>
              <p className="mt-1 font-display text-xl text-foreground">
                {rank.city ? `#${rank.city}` : "—"}
                {rank.city && <span className="ml-1 text-xs font-normal text-muted-foreground">of {rank.cityOf}</span>}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Overall rank</p>
              <p className="mt-1 font-display text-xl text-foreground">
                {rank.overall ? `#${rank.overall}` : "—"}
                {rank.overall && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">of {rank.overallOf}</span>
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-card p-5 shadow-elevate">
          <h2 className="flex items-center gap-1.5 font-display text-xl tracking-tight">
            <Star className="h-4 w-4 text-primary" /> Best player
          </h2>
          {bestPlayer ? (
            <Link
              to="/players/$playerId"
              params={{ playerId: (bestPlayer as BestPlayer).member.id }}
              className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3 transition hover:border-primary/30"
            >
              <PlayerAvatar member={(bestPlayer as BestPlayer).member} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{(bestPlayer as BestPlayer).member.player_name}</div>
                <div className="text-xs text-muted-foreground">
                  {(bestPlayer as BestPlayer).runs} runs
                  {(bestPlayer as BestPlayer).wickets > 0 ? ` · ${(bestPlayer as BestPlayer).wickets} wkts` : ""}
                </div>
              </div>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No stats yet — play a match to see standout performers.</p>
          )}
        </section>

        <section className="mt-5 rounded-xl border border-border bg-card p-5 shadow-elevate">
          <h2 className="font-display text-xl tracking-tight">Team totals</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Runs" v={totalRuns} accent />
            <Stat label="Fours" v={totalFours} />
            <Stat label="Sixes" v={totalSixes} />
            <Stat label="Wickets" v={totalWickets} />
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">Matches</h2>
            <div className="flex items-center gap-2">
              {matches.length > 0 && (
                <Link
                  to="/teams/$teamId/matches"
                  params={{ teamId }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
                >
                  Show all
                </Link>
              )}
              {recentMatches.length > 2 && (
                <div className="hidden gap-2 sm:flex">
                  <button
                    type="button"
                    aria-label="Scroll left"
                    onClick={() => scrollerRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-secondary"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Scroll right"
                    onClick={() => scrollerRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card hover:bg-secondary"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {recentMatches.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No matches played yet.
            </div>
          ) : (
            <div
              ref={scrollerRef}
              className="no-scrollbar mt-3 flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
            >
              {recentMatches.map((m) => (
                <TeamMatchCard key={m.id} match={m} teamId={teamId} compact />
              ))}
              <div className="w-1 shrink-0" />
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-display text-2xl tracking-tight">Squad</h2>

          {members.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No players yet. {isOwner && "Invite your first below."}
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <PlayerAvatar member={m} size={36} />
                  <Link
                    to="/players/$playerId"
                    params={{ playerId: m.id }}
                    className="min-w-0 flex-1 hover:text-primary"
                  >
                    <div className="truncate font-medium">{m.player_name}</div>
                    <div className="text-xs text-muted-foreground">{m.role || "Player"}</div>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => removeMember(m.id)}
                      className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      aria-label="Remove player"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isOwner && (
            <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-elevate">
              <div className="flex items-center gap-2 text-sm font-medium">
                <UserPlus className="h-4 w-4 text-primary" /> Invite players
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Players can only join by phone, invite link, or QR code.
              </p>

              <div className="mt-4 flex gap-1 rounded-lg border border-border bg-background p-1">
                <TabBtn active={tab === "phone"} onClick={() => setTab("phone")} icon={<Phone className="h-3.5 w-3.5" />}>
                  Phone
                </TabBtn>
                <TabBtn active={tab === "link"} onClick={() => setTab("link")} icon={<Link2 className="h-3.5 w-3.5" />}>
                  Link
                </TabBtn>
                <TabBtn active={tab === "qr"} onClick={() => setTab("qr")} icon={<QrCode className="h-3.5 w-3.5" />}>
                  QR
                </TabBtn>
              </div>

              {tab === "phone" && (
                <form onSubmit={addByPhone} className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add a registered JustCric player by their phone number. They&apos;ll appear in your squad
                    instantly.
                  </p>
                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_80px_130px_auto]">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="input font-mono"
                      autoComplete="off"
                      required
                    />
                    <input
                      value={pnum}
                      onChange={(e) => setPnum(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="# jersey"
                      className="input font-mono"
                      inputMode="numeric"
                    />
                    <select value={prole} onChange={(e) => setProle(e.target.value)} className="input">
                      {ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={adding}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110 disabled:opacity-60"
                    >
                      {adding ? "Adding…" : "Add"}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Player must have their phone saved on their JustCric profile. If not, send them the
                    invite link or QR.
                  </p>
                </form>
              )}

              {tab === "link" && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can join your team (team code:
                    <span className="ml-1 font-mono text-foreground">{team.join_code}</span>).
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteUrl}
                      className="input flex-1 select-all font-mono text-xs"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      onClick={() => copy(inviteUrl, "Invite link copied")}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs hover:border-accent/40"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    <button
                      onClick={shareLink}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110"
                    >
                      Share
                    </button>
                  </div>
                </div>
              )}

              {tab === "qr" && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="rounded-xl bg-white p-3">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt="Team invite QR code" width={240} height={240} />
                    ) : (
                      <div className="grid h-[240px] w-[240px] animate-pulse place-items-center text-xs text-black/50">
                        Generating…
                      </div>
                    )}
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    Players can scan this with their phone camera to join.
                  </div>
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`${team.name.replace(/\s+/g, "-").toLowerCase()}-invite-qr.png`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:border-accent/40"
                    >
                      Download QR
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function PlayerAvatar({ member, size }: { member: Member; size: number }) {
  const [broken, setBroken] = useState(false);
  const avatarUrl = member.profile?.avatar_url;
  if (avatarUrl && !broken) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setBroken(true)}
        style={{ height: size, width: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{ height: size, width: size }}
      className="grid shrink-0 place-items-center rounded-full bg-secondary font-mono text-sm text-foreground"
    >
      {member.jersey_number ?? <User className="h-4 w-4" />}
    </span>
  );
}

function Stat({ label, v, accent }: { label: string; v: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accent ? "text-primary" : "text-foreground"}`}>{v}</p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-primary text-primary-foreground shadow"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}