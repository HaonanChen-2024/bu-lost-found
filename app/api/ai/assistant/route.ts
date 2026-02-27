import { NextResponse } from "next/server";
import { buildMatchReply, extractSearchIntent, generateEmbedding } from "@/lib/server/aiClient";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

type AskBody = {
  query?: string;
  topK?: number;
};

type MatchRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  image_urls?: string[];
  score: number;
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`ai-assistant:${ip}`, 20, 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please retry later." },
        {
          status: 429,
          headers: {
            "x-ratelimit-remaining": String(rate.remaining),
            "x-ratelimit-reset": String(rate.resetAt),
          },
        }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = (await req.json()) as AskBody;
    const query = body.query?.trim();
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const normalized = await extractSearchIntent(query);
    const embedding = await generateEmbedding(normalized);

    const { data, error } = await supabaseAdmin.rpc("match_found_posts", {
      query_embedding: embedding,
      match_count: Math.min(Math.max(body.topK ?? 5, 1), 10),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const matches = (data ?? []) as MatchRow[];
    const reply = await buildMatchReply({
      query,
      matches: matches.map((item) => ({
        title: item.title,
        description: item.description,
        location: item.location,
        score: item.score,
      })),
    });

    return NextResponse.json(
      {
        normalized,
        reply,
        matches,
      },
      {
        headers: {
          "x-ratelimit-remaining": String(rate.remaining),
          "x-ratelimit-reset": String(rate.resetAt),
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
