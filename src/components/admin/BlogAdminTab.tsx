import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchAllBlogsForAdmin,
  upsertBlog,
  deleteBlog,
  uploadToBucket,
  slugify,
  type Blog,
} from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ImagePlus, ArrowLeft, Loader2 } from "lucide-react";

const CATEGORIES = ["Cricket", "Fitness", "Tips", "Community", "Announcements"];

const EMPTY: Partial<Blog> = {
  title: "",
  slug: "",
  body: "",
  category: CATEGORIES[0],
  is_published: false,
  cover_image_url: null,
};

export function BlogAdminTab() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Blog> | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Blog | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setBlogs(await fetchAllBlogsForAdmin());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing({ ...EMPTY });
    setSlugTouched(false);
  };
  const startEdit = (b: Blog) => {
    setEditing({ ...b });
    setSlugTouched(true);
  };

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    const slug = (editing.slug || slugify(editing.title)).trim();
    if (!slug) {
      toast.error("Slug is required");
      return;
    }
    setSaving(true);
    try {
      await upsertBlog({ ...editing, title: editing.title.trim(), slug } as Blog);
      toast.success(editing.id ? "Post updated" : "Post created");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save post");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToBucket("blog-images", file);
      setEditing((e) => (e ? { ...e, cover_image_url: url } : e));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteBlog(toDelete.id);
      toast.success("Post deleted");
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete post");
    }
  };

  if (editing) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </button>

        <div className="mt-4 space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <Input
              className="mt-1.5"
              value={editing.title ?? ""}
              onChange={(e) => {
                const title = e.target.value;
                setEditing((prev) => ({
                  ...prev,
                  title,
                  slug: slugTouched ? prev?.slug : slugify(title),
                }));
              }}
              placeholder="Post title"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Slug
            </label>
            <Input
              className="mt-1.5"
              value={editing.slug ?? ""}
              onChange={(e) => {
                setSlugTouched(true);
                setEditing((prev) => ({ ...prev, slug: slugify(e.target.value) }));
              }}
              placeholder="post-url-slug"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              URL: /blog/{editing.slug || "…"}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cover image
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              {editing.cover_image_url ? (
                <img
                  src={editing.cover_image_url}
                  alt="Cover"
                  className="h-16 w-24 rounded-lg object-cover border border-border"
                />
              ) : (
                <div className="grid h-16 w-24 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload image"}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <Select
              value={editing.category ?? CATEGORIES[0]}
              onValueChange={(v) => setEditing((prev) => ({ ...prev, category: v }))}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Body
            </label>
            <Textarea
              className="mt-1.5 min-h-[220px] font-mono text-sm"
              value={editing.body ?? ""}
              onChange={(e) => setEditing((prev) => ({ ...prev, body: e.target.value }))}
              placeholder={"Write in markdown — # Heading, **bold**, *italic*, - bullet list"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Published</p>
              <p className="text-xs text-muted-foreground">
                Visible on the public blog once switched on
              </p>
            </div>
            <Switch
              checked={!!editing.is_published}
              onCheckedChange={(v) => setEditing((prev) => ({ ...prev, is_published: v }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save post"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-1.5" /> New post
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : blogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No blog posts yet — create your first one.
        </div>
      ) : (
        <div className="space-y-3">
          {blogs.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
            >
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {b.cover_image_url && (
                  <img src={b.cover_image_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-sm">{b.title}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${b.is_published ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
                  >
                    {b.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  /blog/{b.slug} {b.category ? `· ${b.category}` : ""}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => startEdit(b)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setToDelete(b)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the post. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}