import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { fetchBlogBySlug, type Blog } from "@/lib/content";
import { renderMarkdown } from "@/lib/markdown";
import { ArrowLeft, Newspaper } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({ meta: [{ title: "Blog — JustCric" }] }),
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchBlogBySlug(slug);
      if (cancelled) return;
      if (!data || !data.is_published) {
        setMissing(true);
      } else {
        setBlog(data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        {loading && (
          <div className="mt-8 animate-pulse space-y-4">
            <div className="aspect-[16/9] w-full rounded-2xl bg-secondary" />
            <div className="h-8 w-3/4 rounded bg-secondary" />
            <div className="h-4 w-1/3 rounded bg-secondary" />
          </div>
        )}

        {!loading && missing && (
          <div className="mt-16 text-center">
            <Newspaper className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl">Post not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This post may have been unpublished or removed.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
            >
              Go home
            </Link>
          </div>
        )}

        {!loading && blog && (
          <article className="mt-8">
            {blog.cover_image_url && (
              <div className="aspect-[16/9] w-full overflow-hidden rounded-2xl bg-secondary">
                <img
                  src={blog.cover_image_url}
                  alt={blog.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="mt-6 flex items-center gap-3">
              {blog.category && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {blog.category}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(blog.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl tracking-tight">{blog.title}</h1>
            <div className="mt-6">{renderMarkdown(blog.body)}</div>
          </article>
        )}
      </div>
    </div>
  );
}