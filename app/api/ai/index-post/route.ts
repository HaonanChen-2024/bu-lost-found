import { NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/server/aiClient";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";
import { getSupabaseAdmin } from "@/lib/server/supabaseAdmin";

type IndexBody = {
  postId?: string;
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`ai-index:${ip}`, 30, 60 * 1000);
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

    const auth = req.headers.get("authorization");
    const token = auth?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const {
      data: { user },
      error: authErr,
    } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as IndexBody;
    if (!body.postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const { data: post, error: postErr } = await supabaseAdmin
      .from("posts")
      .select("id,user_id,title,description,location,status")
      .eq("id", body.postId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (post.status !== "found") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const doc = `${post.title}\n${post.description}\n地点:${post.location ?? "未知"}`;
    const embedding = await generateEmbedding(doc);

    const { error: updateErr } = await supabaseAdmin
      .from("posts")
      .update({ description_embedding: embedding })
      .eq("id", post.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true },
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
