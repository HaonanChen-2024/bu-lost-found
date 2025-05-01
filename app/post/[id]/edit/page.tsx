"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/app/_components/AppShell";
import toast from "react-hot-toast";
import { Post, PostStatus } from "@/lib/models/Post";


export default function EditPostPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<PostStatus>("lost");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);

  /* 拉取原始数据 */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) return toast.error(error.message);
      const p = Post.fromRow(data);
      setPost(p);
      setTitle(p.title);
      setDesc(p.description);
      setStatus(p.status);
      setLocation(p.location);
      setLoading(false);
    })();
  }, [id]);

  async function save() {
    const { error } = await supabase
      .from("posts")
      .update({
        title,
        description: desc,
        status,
        location,
      })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Updated");
      router.push("/my/posts");
    }
  }

  if (loading) return <p className="p-4">Loading…</p>;

  return (
    <AppShell>
      <div className="mx-auto max-w-md p-4">
        <h1 className="mb-6 text-2xl font-bold">Edit Post</h1>

        <input
          className="mb-3 w-full rounded border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="mb-3 h-28 w-full rounded border p-2"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <select
          className="mb-3 w-full rounded border p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as PostStatus)}
        >
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <input
          className="mb-3 w-full rounded border p-2"
          value={location}
          placeholder="Location (optional)"
          onChange={(e) => setLocation(e.target.value)}
        />
        {/* 这里可复用图片组件——留待下一步加多图上传 */}

        <button
          onClick={save}
          className="w-full rounded bg-blue-600 py-2 font-semibold text-white"
        >
          Save
        </button>
      </div>
    </AppShell>
  );
}
