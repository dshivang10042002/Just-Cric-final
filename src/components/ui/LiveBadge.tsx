export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-destructive opacity-80" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
      </span>
      Live
    </span>
  );
}
