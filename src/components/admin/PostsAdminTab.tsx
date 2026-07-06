import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  fetchAllPostsForAdmin,
  upsertPost,
  deletePost,
  uploadToBucket,
  type Post,
  type PostType,
} from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, ImagePlus, ArrowLeft, Loader2, X, Square, RectangleVertical, Ban } from "lucide-react";

const EMPTY: Partial<Post> = { caption: "", images: [], is_published: false, post_type: "square" };

const TYPE_INFO: Record<PostType, { label: string; description: string; icon: typeof Square }> = {
  square: { label: "Square post", description: "Classic square photo(s) with a caption (Read more if it's long)", icon: Square },
  vertical: { label: "Vertical post", description: "Tall, portrait-style photo(s) with a caption (Read more if it's long)", icon: RectangleVertical },
  vertical_no_caption: { label: "Vertical, no caption", description: "Tall, portrait-style photo(s) only — no caption at all", icon: Ban },
};

export function PostsAdminTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickingType, setPickingType] = useState(false);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Post | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setPosts(await fetchAllPostsForAdmin());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => setPickingType(true);
  const chooseType = (post_type: PostType) => {
    setEditing({ ...EMPTY, images: [], post_type });
    setPickingType(false);
  };
  const startEdit = (p: Post) => setEditing({ ...p, images: [...p.images] });

  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map((f) => uploadToBucket("post-images", f)),
      );
      setEditing((e) => (e ? { ...e, images: [...(e.images ?? []), ...urls] } : e));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setEditing((e) => (e ? { ...e, images: (e.images ?? []).filter((u) => u !== url) } : e));
  };

  const save = async () => {
    if (!editing?.images || editing.images.length === 0) {
      toast.error("Add at least one image");
      return;
    }
    setSaving(true);
    try {
      await upsertPost({ ...editing, images: editing.images } as Post);
      toast.success(editing.id ? "Post updated" : "Post created");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save post");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deletePost(toDelete.id);
      toast.success("Post deleted");
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete post");
    }
  };

  if (pickingType) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => setPickingType(false)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to posts
        </button>

        <h3 className="mt-4 text-sm font-semibold">What kind of post is this?</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(Object.keys(TYPE_INFO) as PostType[]).map((t) => {
            const info = TYPE_INFO[t];
            const Icon = info.icon;
            return (
              <button
                key={t}
                onClick={() => chooseType(t)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-md"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold">{info.label}</div>
                <div className="text-xs text-muted-foreground">{info.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            {(() => {
              const Icon = TYPE_INFO[(editing.post_type ?? "square") as PostType].icon;
              return <Icon className="h-3.5 w-3.5" />;
            })()}
            {TYPE_INFO[(editing.post_type ?? "square") as PostType].label}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Images
            </label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {(editing.images ?? []).map((url) => (
                <div
                  key={url}
                  className={`relative overflow-hidden rounded-lg border border-border ${editing.post_type === "square" ? "h-20 w-20" : "h-28 w-16"}`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={`grid place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition hover:border-primary hover:text-primary ${editing.post_type === "square" ? "h-20 w-20" : "h-28 w-16"}`}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleUpload(e.target.files);
                }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Add one image for a single-photo post, or several for a swipeable carousel.
            </p>
          </div>

          {editing.post_type !== "vertical_no_caption" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Caption
              </label>
              <Textarea
                className="mt-1.5"
                value={editing.caption ?? ""}
                onChange={(e) => setEditing((prev) => ({ ...prev, caption: e.target.value }))}
                placeholder="Write a caption…"
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Published</p>
              <p className="text-xs text-muted-foreground">
                Visible in "Optional Updates" on the landing page
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
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No posts yet — create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className={`relative bg-secondary ${p.post_type === "square" ? "aspect-square" : "aspect-[9/16]"}`}>
                {p.images[0] && (
                  <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                )}
                {p.images.length > 1 && (
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {p.images.length}
                  </span>
                )}
                <span
                  className={`absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.is_published ? "bg-primary text-primary-foreground" : "bg-black/60 text-white"}`}
                >
                  {p.is_published ? "Live" : "Draft"}
                </span>
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  {TYPE_INFO[p.post_type ?? "square"].label}
                </span>
              </div>
              <div className="p-2.5">
                {p.post_type !== "vertical_no_caption" && (
                  <p className="line-clamp-2 text-xs text-muted-foreground min-h-[2rem]">
                    {p.caption || "—"}
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => startEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setToDelete(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
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