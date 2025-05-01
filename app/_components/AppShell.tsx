"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Swal from "sweetalert2";            // ← 新增
import { supabase } from "@/lib/supabaseClient";
import { Toaster } from "react-hot-toast";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => setUserEmail(session?.user.email ?? null)
    );
    supabase.auth.getSession().then(({ data }) =>
      setUserEmail(data.session?.user.email ?? null)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  // 1. 将 signOut 调用抽成一个函数
  async function handleSignOut() {
    const res = await Swal.fire({
      title: "Are you sure you want to log out?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, log me out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    });
    if (res.isConfirmed) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Swal.fire("Error", error.message, "error");
      }
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f0f0", color: "#111" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        <Link href="/">
          <strong>BU Lost &amp; Found</strong>
        </Link>

        <div>
          {userEmail ? (
            // 2. 把原来的直接 signOut 改为调用 handleSignOut
            <button onClick={handleSignOut}>
              {userEmail[0].toUpperCase()}
            </button>
          ) : (
            <Link href="/login">
              <button>Login</button>
            </Link>
          )}
        </div>
      </header>

      <main style={{ padding: "1rem" }}>{children}</main>

      <Link href="/post/new">
        <button
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: "#0070f3",
            color: "white",
            fontSize: "1.5rem",
            border: "none",
          }}
        >
          ＋
        </button>
      </Link>

      <Toaster position="top-center" />
    </div>
  );
}
