// app/post/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { supabase } from "@/lib/supabaseClient";
import { Post } from "@/lib/models/Post";
import ImageUploader from "@/app/_components/ImageUploader";
import AppShell from "@/app/_components/AppShell";

export default function NewPostPage() {
  const router = useRouter();

  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [status, setStatus]     = useState<"lost"|"found">("lost");
  const [location, setLocation] = useState("");
  const [files, setFiles]       = useState<File[]>([]);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // 上传多张图片并返回 URL 数组
  async function uploadImage(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase
        .storage
        .from("post-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlObj } = supabase
        .storage
        .from("post-images")
        .getPublicUrl(data.path);

      urls.push(urlObj.publicUrl);
    }
    return urls;
  }

  // 处理表单提交
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 1. 确保登录
    const { data: sessionData } = await supabase.auth.getUser();
    const uid = sessionData.user?.id;
    if (!uid) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }

    // 2. 校验
    if (!title || !desc) {
      setError("Title and description are required.");
      return;
    }

    setLoading(true);
    try {
      // 3. 上传图片
      const imageUrls = await uploadImage();  // string[]

      // 4. 构造 Post 实例
      const post = new Post({
        userId: uid,
        title,
        description: desc,
        status,
        location,
        // 注意这里改成 imageUrls（数组）
        imageUrls,
      });

      // 5. 写库
      const { error: dbErr } = await supabase
        .from("posts")
        .insert(post.toRow());
      if (dbErr) throw dbErr;

      toast.success("Posted!");
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      {/* ←—— 返回按钮 */}
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center text-sm text-blue-600 hover:underline"
      >
        ← Back
      </button>

      <main className="mx-auto max-w-md p-4">
        <h1 className="mb-6 text-2xl font-bold">Create a Post</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="rounded border p-2"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          <textarea
            className="h-28 rounded border p-2"
            placeholder="Description"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            required
          />

          <select
            className="rounded border p-2"
            value={status}
            onChange={e => setStatus(e.target.value as any)}
          >
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>

          <input
            className="rounded border p-2"
            placeholder="Location (optional)"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />

          {/* 图片多选 + 拖拽上传 */}
          <ImageUploader files={files} setFiles={setFiles} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? "Posting…" : "Publish"}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
