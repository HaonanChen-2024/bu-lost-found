"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Post } from "@/lib/models/Post";
import AppShell from "@/app/_components/AppShell";
import toast from "react-hot-toast";

export default function MyFavoritesPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavs();
  }, []);

  async function fetchFavs() {
    setLoading(true);
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) {
      toast.error("Please log in first");
      location.href = "/login";
      return;
    }

    // 查询 favorites 数组包含 uid 的帖子
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .contains("favorites", [uid])
      .order("created_at", { ascending: false });

    if (error) toast.error(error.message);
    else setPosts(data.map((row) => Post.fromRow(row, uid)));

    setLoading(false);
  }

  async function toggleFav(post: Post) {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) {
      toast.error("Please log in first");
      return;
    }

    const newFavs = post.isFavorite
      ? (post.favorites || []).filter((id) => id !== uid)
      : [...(post.favorites || []), uid];

    const { error } = await supabase
      .from("posts")
      .update({ favorites: newFavs })
      .eq("id", post.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPosts(prev =>
        prev.map(p =>
          p.id === post.id
            ? new Post({       // ← 重新 new Post
                ...p,
                isFavorite: !post.isFavorite,
                favorites: newFavs,
              })
            : p
        )
      );
  }

  return (
    <AppShell>
      <h2 className="my-4 text-xl font-bold">My Favorites</h2>

      {loading ? (
        <p>Loading…</p>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">Nothing saved yet.</p>
      ) : (
        posts.map((p) => (
          <article
            key={p.id}
            className="relative mb-4 overflow-hidden rounded-lg bg-white shadow"
          >
            <button
              onClick={() => toggleFav(p)}           
              className="absolute right-3 top-3 text-2xl"
            >
              {p.isFavorite ? "❤️" : "🤍"}
            </button>

            {p.imageUrl && (
              <img src={p.imageUrl} alt="" className="h-40 w-full object-cover" />
            )}
            <div className="p-3">
              <h3 className="line-clamp-1 text-lg font-semibold">{p.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.brief()}</p>
            </div>
          </article>
        ))
      )}
    </AppShell>
  );
}
