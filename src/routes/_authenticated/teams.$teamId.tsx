import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Navbar } from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { FollowButton } from "@/components/FollowButton";
import { ArrowLeft, Copy, Link2, Phone, QrCode, Trash2, UserPlus } from "lucide-react";
 
 
export const Route = createFileRoute("/_authenticated/teams/$teamId")({
  component: TeamDetail,
});
 
type Team = {
  id: string;
  name: string;
  short_name: string | null;
  city: string | null;
  jersey_color: string | null;
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
};
 
const ROLES = ["Batter", "Bowler", "All-rounder", "WK"];
type Tab = "phone" | "link" | "qr";
 
function TeamDetail() {
  const { teamId } = Route.useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
 
  const [tab, setTab] = useState<Tab>("phone");
  // by phone
  const [phone, setPhone] = useState("");
  const [pnum, setPnum] = useState("");
  const [prole, setProle] = useState(ROLES[0]);
  const [adding, setAdding] = useState(false);
  // qr
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
      .select("id, name, short_name, city, jersey_color, created_by, join_code")
      .eq("id", teamId)
      .maybeSingle();
    setTeam((t as Team) ?? null);
    const { data: m } = await supabase
      .from("team_members")
      .select("id, player_name, jersey_number, role, batting_style, bowling_style")
      .eq("team_id", teamId)
      .order("jersey_number", { ascending: true, nullsFirst: false });
    setMembers((m as Member[]) ?? []);
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
 
        {/* Team header — stacks cleanly on mobile */}
        <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-elevate">
          <div className="flex items-start gap-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl font-display text-xl text-white sm:h-16 sm:w-16 sm:text-2xl"
              style={{ backgroundColor: team.jersey_color || "#003527" }}
            >
              {(team.short_name || team.name).slice(0, 3).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl tracking-tight text-primary sm:text-4xl">{team.name}</h1>
              <div className="mt-0.5 text-sm text-muted-foreground">
                {team.city || "—"} · {members.length} player{members.length === 1 ? "" : "s"}
              </div>
              {/* Buttons below team name on mobile, inline on desktop */}
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
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary font-mono text-sm text-foreground">
                    {m.jersey_number ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.player_name}</div>
                    <div className="text-xs text-muted-foreground">{m.role || "Player"}</div>
                  </div>
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
                  {/* Stack vertically on mobile, grid on sm+ */}
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