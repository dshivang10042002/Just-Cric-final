import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */
export type Blog = {
  id: string;
  title: string;
  slug: string;
  cover_image_url: string | null;
  body: string;
  category: string | null;
  is_published: boolean;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PostType = "square" | "vertical" | "vertical_no_caption";
export type PostLayout = "horizontal" | "vertical";

export type Post = {
  id: string;
  caption: string | null;
  images: string[];
  is_published: boolean;
  author_id: string | null;
  created_at: string;
  post_type: PostType;
  layout: PostLayout;
};

/* ─── Slug helper ─── */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ─── Blogs ─── */
export async function fetchPublishedBlogs(limit = 6): Promise<Blog[]> {
  const { data, error } = await supabase
    .from("blogs" as never)
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as Blog[];
}

export async function fetchBlogBySlug(slug: string): Promise<Blog | null> {
  const { data, error } = await supabase
    .from("blogs" as never)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return (data as unknown as Blog) ?? null;
}

export async function fetchAllBlogsForAdmin(): Promise<Blog[]> {
  const { data, error } = await supabase
    .from("blogs" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as Blog[];
}

export async function upsertBlog(blog: Partial<Blog> & { title: string; slug: string }) {
  const { data: u } = await supabase.auth.getUser();
  const payload = {
    ...blog,
    author_id: blog.author_id ?? u.user?.id ?? null,
    updated_at: new Date().toISOString(),
  };
  if (blog.id) {
    const { error } = await supabase
      .from("blogs" as never)
      .update(payload as never)
      .eq("id", blog.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("blogs" as never).insert(payload as never);
    if (error) throw error;
  }
}

export async function deleteBlog(id: string) {
  const { error } = await supabase
    .from("blogs" as never)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/* ─── Posts (Instagram-style) ─── */
export async function fetchPublishedPosts(limit = 12): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts" as never)
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as Post[];
}

export async function fetchAllPostsForAdmin(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as unknown as Post[];
}

export async function upsertPost(post: Partial<Post> & { images: string[] }) {
  const { data: u } = await supabase.auth.getUser();
  const payload = { ...post, author_id: post.author_id ?? u.user?.id ?? null };
  if (post.id) {
    const { error } = await supabase
      .from("posts" as never)
      .update(payload as never)
      .eq("id", post.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("posts" as never).insert(payload as never);
    if (error) throw error;
  }
}

export async function deletePost(id: string) {
  const { error } = await supabase
    .from("posts" as never)
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/* ─── Storage uploads ─── */
export async function uploadToBucket(
  bucket: "blog-images" | "post-images",
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}