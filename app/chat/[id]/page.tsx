// app/chat/[id]/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ChatThread } from "@/lib/models/ChatThread";
import { ChatMessage } from "@/lib/models/ChatMessage";   // ← 引入
import toast from "react-hot-toast";
import AppShell from "@/app/_components/AppShell";

export default function ChatThreadPage() {
  const { id: threadId } = useParams() as { id: string };
  const router = useRouter();

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [uid, setUid]       = useState<string | null>(null);
  const [text, setText]     = useState("");
  const bottomRef          = useRef<HTMLDivElement>(null);

  // 初始化、拉历史、订阅
  useEffect(() => {
    let channel: any;
    (async () => {
      const { data: ud } = await supabase.auth.getUser();
      const userId = ud.user?.id ?? null;
      setUid(userId);

      const { data: tRow, error: tErr } = await supabase
        .from("chat_threads").select("*").eq("id", threadId).single();
      if (tErr || !tRow) {
        toast.error(tErr?.message || "Thread not found");
        router.back();
        return;
      }
      const th = ChatThread.fromRow(tRow);

      const { data: msgs, error: mErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("sent_at", { ascending: true });
      if (mErr) toast.error(mErr.message);
      else msgs.forEach(r => th.addMessage(r.sender_id, r.body));

      setThread(th);

      channel = supabase
        .channel(`chat-${threadId}`)
        .on(
          "postgres_changes",
          {
            event:  "INSERT",
            schema: "public",
            table:  "chat_messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.new;
            th.addMessage(row.sender_id, row.body);
            setThread(new ChatThread({ ...th, messages: [...th.messages] }));
          }
        )
        .subscribe();
    })();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [threadId, router]);

  // 滚动到底
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages]);

  // 发送消息
  async function send() {
    if (!text.trim() || !thread || !uid) return;

    // 1️⃣ 在本地模型里加一条
    const msg = new ChatMessage({
      threadId,
      senderId: uid,
      body: text.trim(),
    });
    // 本地渲染（可选）
    thread.addMessage(uid, text.trim());
    setThread(new ChatThread({ ...thread, messages: [...thread.messages] }));
    setText("");
  
    //  真正写入 chat_messages
    const { error } = await supabase
      .from("chat_messages")
      .insert(msg.toRow());
    if (error) toast.error(error.message);
  }

  if (!thread) return ( <AppShell> <p className="p-4">Loading thread…</p></AppShell>);

  return ( <AppShell>
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="p-4 bg-white shadow">
        <button onClick={() => router.back()} className="text-blue-600">
          ← Back
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {thread.messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-xs rounded-lg p-2 text-sm ${
              m.from === uid ? "ml-auto bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {m.text}
            <div className="mt-1 text-xs text-gray-500">
              {new Date(m.ts).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex border-t p-2 bg-white">
        <input
          className="flex-1 rounded-l border px-3 py-2 focus:outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={!text.trim()}
          className="rounded-r bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
    </AppShell>
  );
}
