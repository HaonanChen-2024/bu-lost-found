"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AppShell from "@/app/_components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { Post } from "@/lib/models/Post";

export default function PostDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error(error?.message ?? "Post not found");
        router.back();
        return;
      }

      setPost(Post.fromRow(data, user?.id));
      setLoading(false);
    })();
  }, [id, router]);

  async function contactOwner() {
    if (!post?.id) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const buyerId = user?.id;
    if (!buyerId) {
      toast.error("Please log in first");
      return;
    }

    const { data: t, error: qErr } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("post_id", post.id)
      .eq("buyer_id", buyerId)
      .eq("seller_id", post.userId)
      .single();

    if (t?.id) {
      router.push(`/chat/${t.id}`);
      return;
    }

    if (qErr && qErr.code !== "PGRST116") {
      toast.error(qErr.message);
      return;
    }

    const { data: tNew, error: cErr } = await supabase
      .from("chat_threads")
      .insert({ post_id: post.id, buyer_id: buyerId, seller_id: post.userId })
      .select("id")
      .single();

    if (cErr || !tNew?.id) {
      toast.error(cErr?.message ?? "Failed to create chat thread");
      return;
    }

    router.push(`/chat/${tNew.id}`);
  }

  if (loading) {
    return (
      <AppShell>
        <p className="p-4">Loading post…</p>
      </AppShell>
    );
  }

  if (!post) {
    return (
      <AppShell>
        <p className="p-4">Post not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl p-4">
        <button onClick={() => router.back()} className="mb-4 text-sm text-blue-600 hover:underline">
          ← Back
        </button>

        <article className="overflow-hidden rounded-lg bg-white shadow">
          {post.imageUrls?.length ? (
            <div className="grid gap-2 p-2 sm:grid-cols-2">
              {post.imageUrls.map((url, index) => (
                <img key={url + index} src={url} alt="post image" className="h-52 w-full rounded object-cover" />
              ))}
            </div>
          ) : null}

          <div className="p-4">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                post.status === "lost" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
              }`}
            >
              {post.status.toUpperCase()}
            </span>
            <h1 className="mt-2 text-2xl font-bold">{post.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-gray-700">{post.description}</p>
            <p className="mt-3 text-sm text-gray-500">Location: {post.location || "Unknown"}</p>
            <p className="mt-1 text-xs text-gray-400">Post ID: {post.id}</p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={contactOwner}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Contact publisher
              </button>
              <button
                onClick={() => router.push(`/post/${post.id}/edit`)}
                className="rounded bg-gray-200 px-4 py-2 text-sm"
              >
                Edit
              </button>
            </div>
          </div>
        </article>
      </main>
    </AppShell>
  );
}
