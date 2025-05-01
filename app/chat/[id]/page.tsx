// app/chat/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChatThread } from "@/lib/models/ChatThread";
import toast from "react-hot-toast";

export default function ChatThreadPage() {
  const { id: threadId } = useParams() as { id: string };
  const router = useRouter();

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any;
    (async () => {
      // 1️⃣ 拿到当前用户
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      setUid(userId);

      // 2️⃣ 读线程元数据
      const { data: tRow, error: tErr } = await supabase
        .from("chat_threads")
        .select("*")
        .eq("id", threadId)
        .single();
      if (tErr || !tRow) {
        toast.error(tErr?.message || "Thread not found");
        router.back();
        return;
      }
      const th = ChatThread.fromRow(tRow);

      // 3️⃣ 拉历史消息
      const { data: msgs, error: mErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("sent_at", { ascending: true });
      if (mErr) {
        toast.error(mErr.message);
      } else {
        msgs.forEach((r) => th.addMessage(r.sender_id, r.body));
      }

      setThread(th);

      // 4️⃣ 实时订阅
      channel = supabase
        .channel(`chat-${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `thread_id=eq.${threadId}`,
          },
          ({ new: row }: any) => {
            th.addMessage(row.sender_id, row.body);
            // 触发重新渲染
            setThread(new ChatThread({ ...th, messages: [...th.messages] }));
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [threadId, router]);

  // 滚到底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  // 发送消息
  async function send() {
    if (!text.trim() || !thread || !uid) return;
    // 本地模型更新
    thread.addMessage(uid, text.trim());
    setThread(new ChatThread({ ...thread, messages: [...thread.messages] }));
    setText("");

    // 写数据库
    const { error } = await supabase.from("chat_messages").insert(thread.toRow());
    if (error) toast.error(error.message);
  }

  if (!thread) return <p id="loading" className="content">Loading thread…</p>;

  return (
    <div id="main" className="container"> {/* 使用 #main 和 .container */}
      {/* ── 顶栏 ── */}
      <header id="header" className="header">
        <nav id="nav" className="nav">
          <button
            id="back-button"
            className="btn"
            onClick={() => router.back()}
          >
            ← Back
          </button>
          <span className="nav-item">Chat</span>
        </nav>
      </header>

      {/* ── 消息列表 ── */}
      <div id="content" className="content">
        {thread.messages.map((m, i) => (
          <div
            key={i}
            className={`list-item ${
              m.from === uid
                ? "item ml-auto bg-blue-600 text-white"
                : "item bg-gray-200"
            }`}
          >
            <p>{m.text}</p>
            <p className="timestamp">{new Date(m.ts).toLocaleTimeString()}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── 输入区 ── */}
      <footer id="footer" className="footer">
        <div id="message-input" className="input">
          <input
            id="msg-field"
            className="border"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button
            id="send-btn"
            className="btn"
            disabled={!text.trim()}
            onClick={send}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
