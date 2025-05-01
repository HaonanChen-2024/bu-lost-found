"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();

  // —— 表单状态 —— 
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  // —— 动态图片 —— 
  const [imgList, setImgList] = useState<string[]>([]);
  const [imgUrl, setImgUrl]   = useState("");

  useEffect(() => {
    fetch("/api/images")
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((arr: string[]) => {
        setImgList(arr);
        if (arr.length) {
          setImgUrl(arr[Math.floor(Math.random() * arr.length)]);
        }
      })
      .catch((err) => {
        console.error("fetch images failed:", err);
      });
  }, []);

  // —— 输入校验标志 —— 
  const emailIsValidBU = email.endsWith("@bu.edu");
  const pwdTooShort    = password.length > 0 && password.length < 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!emailIsValidBU) {
      setError("Please register with your BU e-mail address.");
      return;
    }
    if (pwdTooShort) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (signUpErr) {
      // 已注册
      if (
        signUpErr.message.includes("already registered") ||
        signUpErr.message.includes("email-already-in-use")
      ) {
        setError("This e-mail is already registered. Try logging in instead.");
      } else {
        setError(signUpErr.message);
      }
      return;
    }

    alert("Verification e-mail sent. Please check your inbox.");
    router.push("/login");
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded overflow-hidden shadow-lg bg-white">
        {/* 只有拿到 imgUrl 才渲染 <img> */}
        {imgUrl && (
          <img
            src={imgUrl}
            alt="scenery"
            className="w-full h-40 object-cover"
          />
        )}

        <main className="p-6">
          <h1 className="mb-4 text-2xl font-bold text-center">
            Create Account
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="BU e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full rounded border px-3 py-2 focus:outline-none ${
                !email || emailIsValidBU
                  ? "focus:ring-2 focus:ring-blue-500 border-gray-300"
                  : "border-red-400 ring-red-300"
              }`}
            />

            <input
              type="password"
              placeholder="Password (≥ 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full rounded border px-3 py-2 focus:outline-none ${
                !password || !pwdTooShort
                  ? "focus:ring-2 focus:ring-blue-500 border-gray-300"
                  : "border-red-400 ring-red-300"
              }`}
            />

            {/* 错误信息 */}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Sign Up"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline">
              Log In
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}
