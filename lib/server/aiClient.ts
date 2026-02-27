type Provider = "deepseek" | "zhipu";

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type EmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
};

function getProvider(): Provider {
  const provider = (process.env.AI_PROVIDER ?? "deepseek").toLowerCase();
  return provider === "zhipu" ? "zhipu" : "deepseek";
}

function getBaseUrl(provider: Provider): string {
  if (process.env.AI_BASE_URL) return process.env.AI_BASE_URL;
  return provider === "zhipu"
    ? "https://open.bigmodel.cn/api/paas/v4"
    : "https://api.deepseek.com/v1";
}

function getHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing AI_API_KEY");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

export async function generateEmbedding(input: string): Promise<number[]> {
  const provider = getProvider();
  const baseUrl = getBaseUrl(provider);
  const model =
    process.env.AI_EMBEDDING_MODEL ??
    (provider === "zhipu" ? "embedding-3" : "deepseek-embedding");

  const result = await postJson<EmbeddingResponse>(`${baseUrl}/embeddings`, {
    model,
    input,
  });

  const embedding = result.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error("Embedding response is empty");
  }

  return embedding;
}

export async function extractSearchIntent(query: string): Promise<string> {
  const provider = getProvider();
  const baseUrl = getBaseUrl(provider);
  const model =
    process.env.AI_CHAT_MODEL ??
    (provider === "zhipu" ? "glm-4-flash" : "deepseek-chat");

  const result = await postJson<ChatResponse>(`${baseUrl}/chat/completions`, {
    model,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "你是失物招领信息提取助手。请把用户输入改写成适合向量检索的中文短语，保留核心物品、颜色、时间、地点。只输出一行文本，不要解释。",
      },
      {
        role: "user",
        content: query,
      },
    ],
  });

  return result.choices?.[0]?.message?.content?.trim() || query;
}

export async function buildMatchReply(opts: {
  query: string;
  matches: Array<{ title: string; description: string; location: string; score: number }>;
}): Promise<string> {
  const provider = getProvider();
  const baseUrl = getBaseUrl(provider);
  const model =
    process.env.AI_CHAT_MODEL ??
    (provider === "zhipu" ? "glm-4-flash" : "deepseek-chat");

  const result = await postJson<ChatResponse>(`${baseUrl}/chat/completions`, {
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "你是‘AI智能找物助手’。请基于召回结果，给用户简洁建议：先给最可能匹配结论，再列出1-3条下一步行动建议。",
      },
      {
        role: "user",
        content: JSON.stringify(opts),
      },
    ],
  });

  return (
    result.choices?.[0]?.message?.content?.trim() ||
    "我找到了若干可能匹配的招领信息，建议优先联系相似度最高的发布者确认细节。"
  );
}
