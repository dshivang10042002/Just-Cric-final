import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, HeartOff } from "lucide-react";
import { follow, getFollowState, unfollow, type EntityType } from "@/lib/follows";

export function FollowButton({
  entityType,
  entityId,
  size = "md",
}: {
  entityType: EntityType;
  entityId: string;
  size?: "sm" | "md";
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  const refresh = async () => {
    const s = await getFollowState(entityType, entityId);
    setFollowing(s.following);
    setCount(s.count);
    setSignedIn(!!s.me);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const toggle = async () => {
    if (!signedIn) {
      toast.error("Sign in to follow");
      return;
    }
    setBusy(true);
    try {
      if (following) {
        await unfollow(entityType, entityId);
        setFollowing(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await follow(entityType, entityId);
        setFollowing(true);
        setCount((c) => c + 1);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <button
      onClick={toggle}
      disabled={busy || loading}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition active:scale-95 disabled:opacity-60 ${pad} ${
        following
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary"
      }`}
      aria-pressed={following}
    >
      {following ? <HeartOff className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
      {following ? "Following" : "Follow"}
      <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
    </button>
  );
}
