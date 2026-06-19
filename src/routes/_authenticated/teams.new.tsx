import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/teams/new")({
  component: NewTeam,
});

const PRESET_COLORS = [
  "#003527",
  "#D4AF37",
  "#3DA9FC",
  "#E63946",
  "#9B5DE5",
  "#06D6A0",
  "#F15BB5",
  "#FFD23F",
];

function NewTeam() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [city, setCity] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2) {
      setErr("Team name is required.");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setErr("Not signed in.");
      setSaving(false);
      return;
    }
    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        short_name: shortName.trim() || null,
        city: city.trim() || null,
        jersey_color: color,
        created_by: u.user.id,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    toast.success("Team created");
    navigate({ to: "/teams/$teamId", params: { teamId: data.id } });
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
          New <span className="text-primary">Team</span>
        </h1>

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6 shadow-elevate">
          <Field label="Team name" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pune Panthers"
              className="input"
              maxLength={60}
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Short name">
              <input
                value={shortName}
                onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="PUN"
                className="input font-mono uppercase"
                maxLength={4}
              />
            </Field>
            <Field label="City">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Pune"
                className="input"
                maxLength={60}
              />
            </Field>
          </div>

          <Field label="Jersey color">
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-10 w-10 rounded-lg border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </Field>

          {err && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create team"}
            </button>
            <Link
              to="/teams"
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Link>
          </div>
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
