"use client";

import { useState } from "react";

type MatchItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  image_urls?: string[];
  score: number;
};

type AskResult = {
  normalized: string;
  reply: string;
  matches: MatchItem[];
};

export default function AIAgentPanel() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState("");

  async function askAssistant() {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const json = (await res.json()) as AskResult & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "AI assistant failed");
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">AI 智能找物助手 (AI Agent)</h2>
      <p className="mt-1 text-sm text-gray-600">
        输入自然语言描述（例如：我昨天在图书馆丢了一个黑色保温杯），我会自动召回最可能匹配的招领信息。
      </p>

      <div className="mt-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded border px-3 py-2 text-sm"
          placeholder="请输入丢失描述..."
        />
        <button
          onClick={askAssistant}
          disabled={loading || !query.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-blue-300"
        >
          {loading ? "检索中..." : "开始匹配"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="rounded bg-blue-50 p-3 text-sm">
            <p className="font-medium">检索意图：</p>
            <p>{result.normalized}</p>
            <p className="mt-2 font-medium">AI 建议：</p>
            <p>{result.reply}</p>
          </div>

          {result.matches.map((item) => (
            <article key={item.id} className="rounded border p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{item.title}</h3>
                <span className="text-xs text-gray-500">
                  匹配度 {(item.score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.description}</p>
              <p className="mt-1 text-xs text-gray-500">地点：{item.location || "未填写"}</p>
              <p className="mt-2 text-xs text-gray-500">帖子ID：{item.id}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
