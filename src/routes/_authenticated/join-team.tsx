import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogIn } from "lucide-react";

export const Route = createFileRoute("/_authenticated/join-team")({
  head: () => ({ meta: [{ title: "Join a team — JustCric" }] }),
  component: JoinTeam,
});

type MyTeam = {
  id: string;
  team_id: string;
  player_name: string;
  jersey_number: number | null;
  teams: { id: string; name: string; jersey_color: string | null; short_name: string | null } | null;
};

const ROLES = ["Batter", "Bowler", "All-rounder", "Wicket-keeper"];

function JoinTeam() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [joining, setJoining] = useState(false);
  const [mine, setMine] = useState<MyTeam[]>([]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    // prefill name from profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", u.user.id)
      .maybeSingle();
    if (prof) setName((prof.full_name as string) || (prof.username as string) || "");
    const { data } = await supabase
      .from("team_members")
      .select(
        "id, team_id, player_name, jersey_number, teams:teams!team_members_team_id_fkey(id, name, jersey_color, short_name)",
      )
      .eq("profile_id", u.user.id);
    setMine((data as unknown as MyTeam[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return toast.error("Enter the team code");
    if (!name.trim()) return toast.error("Enter your player name");
    setJoining(true);
    const { data, error } = await supabase.rpc("join_team_with_code", {
      p_code: code.trim().toUpperCase(),
      p_player_name: name.trim(),
      p_jersey: jersey.trim() ? parseInt(jersey, 10) : undefined,
      p_role: role,
    });
    setJoining(false);
    if (error) return toast.error(error.message);
    toast.success("Joined the team! 🏏");
    // find team id to navigate
    const { data: tm } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("id", data as string)
      .maybeSingle();
    if (tm?.team_id) navigate({ to: "/teams/$teamId", params: { teamId: tm.team_id as string } });
    else load();
  };

  const leave = async (memberId: string) => {
    if (!confirm("Leave this team?")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Left the team");
    setMine((m) => m.filter((x) => x.id !== memberId));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          to="/teams"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All teams
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          Join a <span className="text-primary">team</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask your captain for the team&apos;s 6-character code.
        </p>

        <form onSubmit={join} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
              Team code <span className="text-primary">*</span>
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="ABC123"
              className="input text-center font-mono text-2xl tracking-[0.4em]"
              maxLength={6}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
              Your player name <span className="text-primary">*</span>
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Virat Kohli"
              className="input"
              maxLength={60}
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Jersey #
              </span>
              <input
                value={jersey}
                onChange={(e) => setJersey(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="18"
                className="input font-mono"
                inputMode="numeric"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Role
              </span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={joining}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" /> {joining ? "Joining…" : "Join team"}
          </button>
        </form>

        {mine.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl tracking-tight">Teams you&apos;ve joined</h2>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {mine.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-md font-display text-xs text-white"
                    style={{ backgroundColor: m.teams?.jersey_color || "#003527" }}
                  >
                    {(m.teams?.short_name || m.teams?.name || "?").slice(0, 3).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: m.team_id }}
                      className="block truncate font-medium hover:text-primary"
                    >
                      {m.teams?.name ?? "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      as {m.player_name}
                      {m.jersey_number != null ? ` #${m.jersey_number}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => leave(m.id)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  >
                    Leave
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
