import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — JustCric" }] }),
  component: ProfilePage,
});

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  phone: string | null;
  role: string | null;
  batting_style: string | null;
  bowling_style: string | null;
};


const ROLES = ["Batter", "Bowler", "All-rounder", "Wicket-keeper"];
const BAT = ["Right-handed", "Left-handed"];
const BOWL = [
  "Right-arm fast",
  "Left-arm fast",
  "Right-arm medium",
  "Left-arm medium",
  "Right-arm off-spin",
  "Left-arm orthodox",
  "Right-arm leg-spin",
  "Left-arm chinaman",
];

function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await (supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, city, phone, role, batting_style, bowling_style")
      .eq("id", u.user.id)
      .maybeSingle() as unknown as Promise<{ data: Profile | null }>);
    setP(
      data ?? {
        id: u.user.id,
        username: null,
        full_name: null,
        avatar_url: null,
        city: null,
        phone: null,
        role: null,
        batting_style: null,
        bowling_style: null,
      },
    );


  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file: File) => {
    if (!p) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large (max 4MB)");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${p.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    // Private bucket → use a long-lived signed URL
    const { data: signed, error: sErr } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setUploading(false);
    if (sErr || !signed) return toast.error(sErr?.message || "Could not get URL");
    setP({ ...p, avatar_url: signed.signedUrl });
    toast.success("Photo uploaded — don't forget to save");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p) return;
    const uname = (p.username || "").trim().toLowerCase();
    if (uname && !/^[a-z0-9_]{3,20}$/.test(uname)) {
      return toast.error("Username: 3–20 chars, a–z 0–9 _ only");
    }
    setSaving(true);
    const cleanedPhone = (p.phone || "").replace(/[^0-9+]/g, "") || null;
    if (cleanedPhone && cleanedPhone.replace(/\D/g, "").length < 6) {
      setSaving(false);
      return toast.error("Phone number looks too short");
    }
    const updatePayload = {
      username: uname || null,
      full_name: p.full_name?.trim() || null,
      avatar_url: p.avatar_url,
      city: p.city?.trim() || null,
      phone: cleanedPhone,
      role: p.role,
      batting_style: p.batting_style,
      bowling_style: p.bowling_style,
    } as never;
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", p.id);

    setSaving(false);
    if (error) {
      if (error.message.includes("profiles_username_lower_idx")) {
        return toast.error("That username is taken");
      }
      if (error.message.includes("profiles_phone_unique_idx")) {
        return toast.error("That phone number is already on another profile");
      }
      return toast.error(error.message);
    }
    toast.success("Profile saved");

  };

  if (!p) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  const initial = (p.full_name || p.username || "?").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-tight">
          My <span className="text-primary">Profile</span>
        </h1>
        {p.username && (
          <p className="mt-1 text-sm text-muted-foreground">
            Public profile:{" "}
            <Link
              to="/players/$playerId"
              params={{ playerId: p.id }}
              className="text-primary hover:underline"
            >
              @{p.username}
            </Link>
          </p>
        )}

        <form onSubmit={save} className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-border bg-secondary">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-4xl text-primary">{initial}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border border-border bg-primary text-primary-foreground shadow"
                aria-label="Change photo"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              JPG or PNG, up to 4MB. Square images look best.
            </div>
          </div>

          <Field label="Username (your @id)">
            <input
              value={p.username ?? ""}
              onChange={(e) => setP({ ...p, username: e.target.value })}
              placeholder="e.g. virat18"
              className="input"
              maxLength={20}
            />
          </Field>

          <Field label="Full name">
            <input
              value={p.full_name ?? ""}
              onChange={(e) => setP({ ...p, full_name: e.target.value })}
              placeholder="Virat Kohli"
              className="input"
              maxLength={60}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City">
              <input
                value={p.city ?? ""}
                onChange={(e) => setP({ ...p, city: e.target.value })}
                placeholder="Mumbai"
                className="input"
                maxLength={40}
              />
            </Field>
            <Field label="Primary role">
              <select
                value={p.role ?? ""}
                onChange={(e) => setP({ ...p, role: e.target.value || null })}
                className="input"
              >
                <option value="">—</option>
                {ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Phone (so captains can invite you)">
            <input
              type="tel"
              value={p.phone ?? ""}
              onChange={(e) => setP({ ...p, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="input font-mono"
              maxLength={20}
              autoComplete="tel"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Only captains adding you to a team can use this — it&apos;s not shown publicly.
            </span>
          </Field>



          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Batting style">
              <select
                value={p.batting_style ?? ""}
                onChange={(e) => setP({ ...p, batting_style: e.target.value || null })}
                className="input"
              >
                <option value="">—</option>
                {BAT.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Bowling style">
              <select
                value={p.bowling_style ?? ""}
                onChange={(e) => setP({ ...p, bowling_style: e.target.value || null })}
                className="input"
              >
                <option value="">—</option>
                {BOWL.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>

          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-95 hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
