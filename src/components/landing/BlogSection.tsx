import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { fetchPublishedBlogs, type Blog } from "@/lib/content";
import { excerptFromMarkdown } from "@/lib/markdown";
import { ArrowUpRight, Newspaper } from "lucide-react";

export function BlogSection() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await fetchPublishedBlogs(6);
      setBlogs(data);
      setLoading(false);
    })();
  }, []);

  if (!loading && blogs.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Newspaper className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-tight">Blog &amp; News</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stories, tips and updates from JustCric
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="aspect-[16/10] bg-secondary" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-16 rounded bg-secondary" />
                <div className="h-4 w-full rounded bg-secondary" />
                <div className="h-3 w-3/4 rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {blogs.map((b) => (
            <Link
              key={b.id}
              to="/blog/$slug"
              params={{ slug: b.slug }}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-elevate transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-secondary">
                {b.cover_image_url ? (
                  <img
                    src={b.cover_image_url}
                    alt={b.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/20 to-primary/5">
                    <Newspaper className="h-8 w-8 text-primary/40" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  {b.category && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {b.category}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(b.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition">
                  {b.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  {excerptFromMarkdown(b.body, 110)}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  Read more <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}