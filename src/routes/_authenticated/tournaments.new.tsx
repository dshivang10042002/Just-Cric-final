import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tournaments/new")({
  component: NewTournament,
});

function NewTournament() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [format, setFormat] = useState<"league" | "knockout">("league");
  const [overs, setOvers] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setSaving(false);
      return setErr("Not signed in.");
    }
    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        created_by: u.user.id,
        name: name.trim(),
        short_name: shortName.trim() || null,
        format,
        overs_per_match: overs,
        start_date: startDate || null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) return setErr(error?.message ?? "Failed to create");
    toast.success("Tournament created");
    navigate({ to: "/tournaments/$tournamentId", params: { tournamentId: data.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Tournaments
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          New <span className="text-primary">Tournament</span>
        </h1>

        <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
              Name <span className="text-primary">*</span>
            </span>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              required
              placeholder="Summer Slam '26"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Short name
              </span>
              <input
                className="input"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                maxLength={16}
                placeholder="SS26"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Overs per match
              </span>
              <input
                type="number"
                min={1}
                max={50}
                className="input font-mono"
                value={overs}
                onChange={(e) => setOvers(parseInt(e.target.value || "1", 10))}
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Format
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["league", "knockout"] as const).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`rounded-md border px-3 py-2.5 text-sm font-semibold capitalize transition ${
                      format === f
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Start date
              </span>
              <input
                type="date"
                className="input font-mono"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
          </div>

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
            {saving ? "Creating…" : "Create tournament 🏆"}
          </button>
        </form>
      </main>
    </div>
  );
}
