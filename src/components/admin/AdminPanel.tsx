import { Navbar } from "@/components/layout/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogAdminTab } from "@/components/admin/BlogAdminTab";
import { PostsAdminTab } from "@/components/admin/PostsAdminTab";
import { ShieldCheck } from "lucide-react";

export function AdminPanel() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight">Admin</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage blog posts and community updates
            </p>
          </div>
        </div>

        <Tabs defaultValue="blog" className="mt-8">
          <TabsList>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="posts">Posts</TabsTrigger>
          </TabsList>
          <TabsContent value="blog" className="mt-6">
            <BlogAdminTab />
          </TabsContent>
          <TabsContent value="posts" className="mt-6">
            <PostsAdminTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}