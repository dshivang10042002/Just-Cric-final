// Reusable player avatar with initials fallback (deterministic color per player)
const COLORS = [
  "#003527", "#9B5DE5", "#3DA9FC", "#E63946",
  "#06D6A0", "#F15BB5", "#D4AF37", "#FB8500",
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const ROLE_COLORS: Record<string, string> = {
  Batter: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  Bowler: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "All-rounder": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  WK: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

export function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  const cls = ROLE_COLORS[role] ?? "bg-secondary text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {role}
    </span>
  );
}

export function PlayerAvatarChip({
  name, avatarUrl, size = "md",
}: { name: string; avatarUrl: string | null; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-10 w-10 text-xs" : size === "lg" ? "h-20 w-20 text-2xl" : "h-12 w-12 text-sm";
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${dims} shrink-0 rounded-full object-cover border border-border`} />;
  }
  return (
    <div
      className={`${dims} shrink-0 grid place-items-center rounded-full font-display font-bold text-white`}
      style={{ backgroundColor: colorForName(name) }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}