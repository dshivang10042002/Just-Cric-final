import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Coins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/matches/new")({
  component: NewMatch,
});

type Team = { id: string; name: string; short_name: string | null; jersey_color: string | null };

function NewMatch() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [overs, setOvers] = useState(20);
  const [venue, setVenue] = useState("");
  const [callerCall, setCallerCall] = useState<"heads" | "tails" | null>(null);
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState<"bat" | "bowl">("bat");
  const [flipping, setFlipping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const teamAName = teams.find((t) => t.id === teamA)?.name ?? "Team A";
  const teamBName = teams.find((t) => t.id === teamB)?.name ?? "Team B";

  const flipCoin = () => {
    if (!teamA || !teamB) return setErr("Pick both teams before tossing.");
    if (!callerCall) return setErr(`${teamBName} must call Heads or Tails first.`);
    setErr(null);
    setFlipping(true);
    setCoinResult(null);
    setTossWinner("");
    setTossDecision("bat");
    setTimeout(() => {
      const result: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
      const winner = result === callerCall ? teamB : teamA;
      setCoinResult(result);
      setTossWinner(winner);
      setFlipping(false);
      const name = teams.find((t) => t.id === winner)?.name ?? "Team";
      toast.success(`🪙 ${result.toUpperCase()} — ${name} won the toss!`);
    }, 1100);
  };

  const resetToss = () => {
    setCoinResult(null);
    setTossWinner("");
    setCallerCall(null);
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("teams")
        .select("id, name, short_name, jersey_color")
        .eq("created_by", u.user.id)
        .order("name");
      setTeams((data as Team[]) ?? []);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!teamA || !teamB) return setErr("Pick both teams.");
    if (teamA === teamB) return setErr("Teams must be different.");
    if (!tossWinner) return setErr("Pick the toss winner.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSaving(false);
      return setErr("Not signed in.");
    }
    // Create match
    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        created_by: u.user.id,
        team_a_id: teamA,
        team_b_id: teamB,
        overs,
        venue: venue.trim() || null,
        toss_winner_id: tossWinner,
        toss_decision: tossDecision,
        status: "live",
        started_at: new Date().toISOString(),
        current_innings: 1,
      })
      .select("id")
      .single();
    if (error || !match) {
      setSaving(false);
      return setErr(error?.message ?? "Failed to create match");
    }
    // Compute innings 1 batting/bowling
    const battingFirst =
      tossDecision === "bat" ? tossWinner : tossWinner === teamA ? teamB : teamA;
    const bowlingFirst = battingFirst === teamA ? teamB : teamA;
    const { error: e2 } = await supabase.from("innings").insert({
      match_id: match.id,
      innings_no: 1,
      batting_team_id: battingFirst,
      bowling_team_id: bowlingFirst,
    });
    setSaving(false);
    if (e2) return setErr(e2.message);
    toast.success("Match created — let's score!");
    navigate({ to: "/matches/$matchId/score", params: { matchId: match.id } });
  };

  if (teams.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <Link
            to="/matches"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Matches
          </Link>
          <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
            <h1 className="font-display text-2xl">You need at least 2 teams</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create two teams to start a match.
            </p>
            <Link
              to="/teams/new"
              className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              + Create a team
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          to="/matches"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Matches
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          New <span className="text-primary">Match</span>
        </h1>

        <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Team A" required>
              <select className="input" value={teamA} onChange={(e) => setTeamA(e.target.value)} required>
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === teamB}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Team B" required>
              <select className="input" value={teamB} onChange={(e) => setTeamB(e.target.value)} required>
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === teamA}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Overs" required>
              <input
                type="number"
                min={1}
                max={50}
                value={overs}
                onChange={(e) => setOvers(parseInt(e.target.value || "1", 10))}
                className="input font-mono"
              />
            </Field>
            <Field label="Venue">
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Local Ground"
                className="input"
                maxLength={80}
              />
            </Field>
          </div>

          <Field label="Toss" required>
            <div className="space-y-4 rounded-lg border border-border bg-background p-4">
              <p className="text-center text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{teamAName}</span> flips the coin.{" "}
                <span className="font-semibold text-foreground">{teamBName}</span> calls it.
              </p>

              {/* Caller's call */}
              <div>
                <span className="mb-2 block text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                  {teamBName} — call it
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["heads", "tails"] as const).map((side) => {
                    const active = callerCall === side;
                    return (
                      <button
                        type="button"
                        key={side}
                        disabled={flipping || !teamA || !teamB || !!coinResult}
                        onClick={() => setCallerCall(side)}
                        className={`rounded-md border px-3 py-2.5 text-sm font-semibold capitalize transition disabled:opacity-50 ${active ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {side}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coin */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={flipCoin}
                  disabled={flipping || !teamA || !teamB || !callerCall || !!coinResult}
                  className="group relative grid h-24 w-24 place-items-center rounded-full border-2 border-primary bg-primary/10 transition active:scale-95 disabled:opacity-50"
                  aria-label="Flip the coin"
                >
                  {coinResult && !flipping ? (
                    <span className="font-display text-lg uppercase tracking-wider text-primary">
                      {coinResult === "heads" ? "H" : "T"}
                    </span>
                  ) : (
                    <Coins
                      className={`h-10 w-10 text-primary transition-transform ${flipping ? "animate-spin" : "group-hover:rotate-12"}`}
                      style={flipping ? { animationDuration: "150ms" } : undefined}
                    />
                  )}
                </button>
                <p className="mt-3 text-center text-xs uppercase tracking-widest text-muted-foreground">
                  {flipping
                    ? "Flipping…"
                    : tossWinner
                      ? `${coinResult?.toUpperCase()} — ${teams.find((t) => t.id === tossWinner)?.name} won the toss`
                      : callerCall
                        ? "Tap the coin to flip"
                        : "Caller picks a side first"}
                </p>
                {tossWinner && !flipping && (
                  <button
                    type="button"
                    onClick={resetToss}
                    className="mt-1.5 text-[11px] text-muted-foreground underline hover:text-foreground"
                  >
                    Re-toss
                  </button>
                )}
              </div>

              {/* Decision */}
              {tossWinner && !flipping && (
                <div>
                  <span className="mb-1.5 block text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                    {teams.find((t) => t.id === tossWinner)?.name} elected to
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["bat", "bowl"] as const).map((d) => {
                      const active = tossDecision === d;
                      return (
                        <button
                          type="button"
                          key={d}
                          onClick={() => setTossDecision(d)}
                          className={`rounded-md border px-3 py-2.5 text-sm font-semibold capitalize transition ${active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                        >
                          {d} first
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Field>


          {err && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Start match 🏏"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}
