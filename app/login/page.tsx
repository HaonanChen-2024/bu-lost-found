"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 存储从后台拿到的图片 URL 列表
  const [imgList, setImgList] = useState<string[]>([]);
  // 存储当前选中的那一个
  const [imgUrl, setImgUrl] = useState<string>("");

  // ① 客户端 mount 后，调用 /api/images 拿列表
  useEffect(() => {
    fetch("/api/images")
      .then((res) => res.json())
      .then((imgs: string[]) => {
        setImgList(imgs);
        if (imgs.length > 0) {
          const choice = imgs[Math.floor(Math.random() * imgs.length)];
          setImgUrl(choice);
        }
      })
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) return alert(error.message);
    router.push("/");
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded overflow-hidden shadow-lg bg-white">
        {/* ② 只有 imgUrl 拿到后才渲染 <img> */}
        {imgUrl && (
          <img
            src={imgUrl}
            alt="scenery"
            className="w-full h-40 object-cover"
          />
        )}

        <main className="p-6">
          <h1 className="mb-4 text-2xl font-bold text-center">
            Welcome to BU Lost & Found
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Log In"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Need an account?{" "}
            <a href="/signup" className="text-blue-600 hover:underline">
              Sign Up
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}
