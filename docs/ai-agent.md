# AI 智能找物助手接入说明

## 1. 环境变量

在 `.env.local` 配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI provider: deepseek 或 zhipu
AI_PROVIDER=deepseek
AI_API_KEY=...
AI_CHAT_MODEL=deepseek-chat
AI_EMBEDDING_MODEL=deepseek-embedding
# 可选：覆盖 API 网关
# AI_BASE_URL=https://api.deepseek.com/v1
```

## 2. 数据库初始化

执行 `supabase/sql/ai_assistant.sql`：

- 给 `posts` 表增加 `description_embedding vector(1024)` 字段。
- 创建 `match_found_posts(query_embedding, match_count)` RPC，用于向量检索。

## 3. 运行链路

1. 用户发布 `found` 帖子。
2. 前端插入成功后调用 `/api/ai/index-post`。
3. 服务端读取帖子文本，调用 Embedding 模型生成向量，并回写到 `posts.description_embedding`。
4. 用户在首页 AI 聊天框提问，前端调用 `/api/ai/assistant`。
5. 服务端先做意图提取，再做向量检索（RAG 召回），最后由 LLM 生成自然语言建议。

## 4. 主要新增文件

- `app/_components/AIAgentPanel.tsx`
- `app/api/ai/index-post/route.ts`
- `app/api/ai/assistant/route.ts`
- `lib/server/aiClient.ts`
- `lib/server/supabaseAdmin.ts`
- `supabase/sql/ai_assistant.sql`
