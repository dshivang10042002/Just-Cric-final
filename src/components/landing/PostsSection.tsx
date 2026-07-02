import { useEffect, useRef, useState } from "react";
import { fetchPublishedPosts, type Post } from "@/lib/content";
import { ChevronLeft, ChevronRight, ImagePlus, Heart } from "lucide-react";

function PostCard({ post }: { post: Post }) {
  const [idx, setIdx] = useState(0);
  const multi = post.images.length > 1;

  return (
    <div className="w-[280px] sm:w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-elevate">
      <div className="relative aspect-square w-full overflow-hidden bg-secondary">
        {post.images.length > 0 ? (
          <img
            src={post.images[idx]}
            alt={post.caption ?? "Post image"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
          </div>
        )}

        {multi && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => setIdx((v) => (v === 0 ? post.images.length - 1 : v - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => setIdx((v) => (v === post.images.length - 1 ? 0 : v + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {post.images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition ${i === idx ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Heart className="h-4 w-4" />
          <span className="text-[11px]">
            {new Date(post.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        {post.caption && <p className="mt-1.5 text-sm leading-snug whitespace-pre-wrap">{post.caption}</p>}
      </div>
    </div>
  );
}

export function PostsSection() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchPublishedPosts(12);
      setPosts(data);
      setLoading(false);
    })();
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl tracking-tight">Optional Updates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Snapshots from the JustCric community
            </p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollerRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card transition hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollerRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card transition hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-[280px] sm:w-[320px] shrink-0 animate-pulse rounded-2xl border border-border bg-card"
              >
                <div className="aspect-square w-full bg-secondary" />
                <div className="p-3.5 space-y-2">
                  <div className="h-3 w-16 rounded bg-secondary" />
                  <div className="h-3 w-full rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 pb-2 sm:px-6"
          style={{ scrollPaddingLeft: "1rem" }}
        >
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          <div className="shrink-0 w-1" />
        </div>
      )}
    </section>
  );
}