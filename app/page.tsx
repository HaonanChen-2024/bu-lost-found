// app/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Post } from "@/lib/models/Post";
import AppShell from "@/app/_components/AppShell";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";   // 新增


type Filter = "all" | "lost" | "found" | "mine";

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();


  // 初始加载
  useEffect(() => {
    resetAndLoad();
  }, [filter]);

  // 无限滚动
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { threshold: 1 }
    );
    if (sentinelRef.current) io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [sentinelRef.current, cursor, filter]);

  /** 清空并加载第一页 */
  async function resetAndLoad() {
    setPosts([]);
    setCursor(null);
    await loadMore(true);
  }
  

  async function loadMore(reset = false) {
    /* 1️⃣ 先拿当前登录用户（可复用后面 mine 过滤的查询） */
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id;           // 可能为 undefined（未登录）
  
    /* 2️⃣ 构建查询 */
    let query = supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
  
    if (cursor && !reset) query = query.lt("created_at", cursor);
    if (filter === "lost" || filter === "found") query = query.eq("status", filter);
    if (filter === "mine") {
      if (uid) query = query.eq("user_id", uid);
      else {
        toast.error("Please log in first");
        return;
      }
    }
  
    /* 3️⃣ 执行查询 */
    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
      return;
    }
  
    /* 4️⃣ 映射时把 uid 传进去 */
    if (data && data.length) {
      const mapped = data.map(row => Post.fromRow(row, uid));  // 先映射

      setPosts(prev => {
        const merged = [...prev, ...mapped];      // ← 用 mapped 而非 newRows
        const seen = new Set<string>();
        return merged.filter(p => {
          if (!p.id) return false;                // 忽略没有 id 的异常数据
          if (seen.has(p.id)) return false;       // 去重
          seen.add(p.id);
          return true;
        });
      });    
      setCursor(data[data.length - 1].created_at);
    }
  }


  async function getOrCreateThread(postId: string, sellerId: string) {
    // 当前登录用户
    const { data } = await supabase.auth.getUser();
    const buyerId = data.user?.id;
    if (!buyerId) { toast.error("Please log in first"); return null; }
  
    // 先查
    const { data: t, error: qErr } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("post_id", postId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .single();
  
    if (t) return t.id;
    if (qErr && qErr.code !== "PGRST116") { toast.error(qErr.message); return null; }
  
    // 没有就创建
    const { data: tNew, error: cErr } = await supabase
      .from("chat_threads")
      .insert({ post_id: postId, buyer_id: buyerId, seller_id: sellerId })
      .select("id")
      .single();
  
    if (cErr) { toast.error(cErr.message); return null; }
    return tNew.id;
  }
  
  async function handleChat(post: Post) {
    const threadId = await getOrCreateThread(post.id!, post.userId);
    if (threadId) router.push(`/chat/${threadId}`);
  }
  
  

  /* 2️⃣ 把 toggleFav 定义在这里 —— 能直接用 posts & setPosts */
  async function toggleFav(post: Post) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in first");
      return;
    }

    /** 更新数据库：示例用 posts.favorites uuid[] 字段 **/
    const newFavs = post.isFavorite
      ? (post.favorites || []).filter((id) => id !== user.id)
      : [...(post.favorites || []), user.id];

    const { error } = await supabase
      .from("posts")
      .update({ favorites: newFavs })
      .eq("id", post.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    /** 前端状态同步 —— 翻转 isFavorite 标记 **/
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? new Post({ ...p, isFavorite: !post.isFavorite, favorites: newFavs })
          : p
      )
    );
    
  }


  return (
    <AppShell>
      {/* 过滤器 */}
      <div className="my-3 flex justify-around">
        {(["all", "lost", "found", "mine"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              if (f === "mine") {
                window.location.href = "/my/posts";   // 跳独立页面
              } else {
                setFilter(f);
              }}
            }
            className={`flex-1 rounded py-1 text-sm capitalize
              ${filter === f ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 列表 / 空状态 */}
      {posts.length === 0 ? (
        <div className="mt-20 text-center">
          <img src="/empty.svg" className="mx-auto w-32" />
          <p className="mt-4 text-gray-500">
            No items yet. Tap the “＋” to create one!
          </p>
        </div>
      ) : (
        posts.map((p) => (
          <article
            key={p.id}
            className="relative mb-4 overflow-hidden rounded-lg bg-white shadow"
          >
            {/* 收藏按钮：绝对定位在右上角 */}
          <button
            onClick={() => toggleFav(p)}
            className="absolute right-3 top-3 top-3"
          >
            {p.isFavorite ? "❤️" : "🤍"}
          </button>

          
            {p.imageUrls?.[0] && (
              <img src={p.imageUrls[0]} alt="" className="h-40 w-full object-cover" />
            )}
            <div className="p-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium
                  ${
                    p.status === "lost"
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  }`}
              >
                {p.status.toUpperCase()}
              </span>

              <h2 className="mt-2 line-clamp-1 text-lg font-semibold">
                {p.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {p.brief()}
              </p>
              <button
                onClick={() => handleChat(p)}
                className="mt-2 inline-block rounded bg-blue-600 px-3 py-1 text-white"
              >
                Chat
              </button>
              <button
                onClick={() => router.push(`/post/${p.id}/edit`)}
                className="rounded bg-gray-200 px-3 py-1"
              >
                Edit
              </button>
            </div>
          </article>
        ))
      )}

      {/* 无限加载触发器 */}
      <div ref={sentinelRef} className="h-10" />
    </AppShell>
  );
}
