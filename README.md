# BU Lost & Found

一个基于 **Next.js + Supabase** 的校园失物招领平台，支持：

- 失物 / 招领帖子发布与浏览
- 图片上传（Supabase Storage）
- 用户登录注册（Supabase Auth）
- 帖子收藏与私聊
- **AI 智能找物助手（RAG + pgvector）**

---

## 技术栈

- **前端**: Next.js 15 (App Router), React 19, TypeScript
- **后端能力**: Next.js Route Handlers (`app/api/*`)
- **数据库与鉴权**: Supabase (Postgres + Auth + Storage)
- **向量检索**: Supabase pgvector (`vector` extension + RPC)
- **AI 提供商**: DeepSeek / 智谱（可通过环境变量切换）

---

## 目录结构

```text
app/
  _components/            # 通用 UI 组件（含 AIAgentPanel）
  api/
    ai/assistant/route.ts # AI 查询：意图提取 + 向量召回 + 文案生成
    ai/index-post/route.ts# 对 found 帖子做 embedding 入库
  chat/                   # 私聊页面
  post/                   # 发帖、编辑页面
lib/
  models/                 # 前端领域模型（Post / ChatThread / ChatMessage）
  server/                 # 服务端 AI / Supabase admin 封装
  supabaseClient.ts       # 前端 Supabase 客户端
supabase/sql/
  ai_assistant.sql        # pgvector 字段与 match_found_posts RPC
docs/
  ai-agent.md             # AI 模块接入说明
```

---

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 配置环境变量

在项目根目录新建 `.env.local`：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# AI provider: deepseek | zhipu
AI_PROVIDER=deepseek
AI_API_KEY=...
AI_CHAT_MODEL=deepseek-chat
AI_EMBEDDING_MODEL=deepseek-embedding
# 可选：自定义网关
# AI_BASE_URL=https://api.deepseek.com/v1
```

> 注意：`SUPABASE_SERVICE_ROLE_KEY` 仅用于服务端 API，不要暴露到前端。

### 3) 初始化数据库（AI 检索）

在 Supabase SQL Editor 执行：

- `supabase/sql/ai_assistant.sql`

该脚本会：

1. 启用 `vector` 扩展
2. 在 `posts` 表新增 `description_embedding vector(1024)`
3. 创建向量召回函数 `match_found_posts(query_embedding, match_count)`

### 4) 启动开发环境

```bash
npm run dev
```

浏览器访问：<http://localhost:3000>

---

## AI 智能找物助手说明

### 数据流

1. 用户发布 `found` 帖子
2. 前端调用 `/api/ai/index-post`
3. 后端生成 embedding，并写入 `posts.description_embedding`
4. 用户在首页 AI 输入框描述丢失物品
5. 后端 `/api/ai/assistant`：
   - LLM 意图提取
   - 向量检索（RPC）
   - LLM 生成推荐回复

### 相关接口

- `POST /api/ai/index-post`
  - 入参: `{ postId: string }`
  - 鉴权: `Authorization: Bearer <access_token>`
  - 行为: 仅对 `status=found` 帖子索引 embedding

- `POST /api/ai/assistant`
  - 入参: `{ query: string, topK?: number }`
  - 出参: `normalized`, `reply`, `matches[]`

详细可见 `docs/ai-agent.md`。

---

## 常用脚本

```bash
npm run dev     # 本地开发
npm run build   # 生产构建
npm run start   # 启动生产服务
npm run lint    # ESLint
```

---

## 后续建议

- 增加帖子详情页（避免 AI 结果跳转到编辑页）
- 为 embedding 维度做配置化，避免模型切换后维度不一致
- 增加 AI 接口速率限制与审计日志
- 统一修复仓库历史 lint / 类型问题
