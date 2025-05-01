"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Post } from "@/lib/models/Post";
import AppShell from "@/app/_components/AppShell";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";


export default function MyPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); 

  useEffect(() => {
    fetchMine();
  }, []);

  async function fetchMine() {
    setLoading(true);

    const { data: session, error: userErr } = await supabase.auth.getUser();
    const user = session.user;
    if (userErr || !user) {
      toast.error("Please log in first");
      window.location.href = "/login";
      return;
    }

    const uid = user.id;                      // ← ① 现在真正拿到 uid

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
    } else {
      // ② 用 row => Post.fromRow(row, uid)
      setPosts(data.map(row => Post.fromRow(row, uid)));
    }
    setLoading(false);
  }

  async function deletePost(id: string) {
    const res = await Swal.fire({
      title: "Delete this post?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });
    if (!res.isConfirmed) return;
  
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }
  
  return (
    <AppShell>
      <h2 className="my-4 text-xl font-bold">My Posts</h2>

      {loading ? (
        <p>Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">You have not posted anything yet.</p>
      ) : (
        posts.map(p => (
          <article
            key={p.id}
            className="mb-4 overflow-hidden rounded-lg bg-white shadow"
          >
            {p.imageUrl && (
              <img src={p.imageUrl} alt="" className="h-36 w-full object-cover" />
            )}
            <div className="p-3">
              <h3 className="line-clamp-1 text-lg font-semibold">{p.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.brief()}</p>

              <div className="mt-3 flex gap-2">
                {/* 1. 编辑按钮 */}
                <button
                  onClick={() => router.push(`/post/${p.id}/edit`)}
                  className="rounded bg-gray-200 px-3 py-1 text-gray-800 hover:bg-gray-300"
                >
                 Edit
                </button>

               {/* 2. 删除按钮 */}
                <button
                  onClick={() => deletePost(p.id!)}
                  className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </AppShell>
  );
}
