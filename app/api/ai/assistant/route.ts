import { NextResponse } from "next/server";
import {
  buildMatchReply,
  extractSearchIntent,
  generateEmbedding,
} from "@/lib/server/aiClient";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

type AskBody = {
  query?: string;
  topK?: number;
};

type MatchRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  image_urls?: string[];
  score: number;
};

export async function POST(req: Request) {
  try {
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

    return NextResponse.json({
      normalized,
      reply,
      matches,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
