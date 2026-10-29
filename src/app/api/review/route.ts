import { NextResponse } from "next/server";
import { fetchPr, UserError } from "@/lib/github";
import { generateReview, validateReview } from "@/lib/review";
import { mockRaw } from "@/lib/mock";
import { checkLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

const MAX_TRANSCRIPT = 12_000;

export async function POST(req: Request) {
  try {
    const { url, transcript } = await req.json();
    const text = String(transcript ?? "").trim();
    if (text.split(/\s+/).filter(Boolean).length < 8) {
      throw new UserError("Say a bit more. Talk through what you noticed in the PR, then try again.");
    }
    if (text.length > MAX_TRANSCRIPT) {
      throw new UserError("That's a long ramble. Keep it under about 2,000 words per review.");
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
    const limited = checkLimit(ip);
    if (limited) throw new UserError(limited, 429);

    const { meta, files } = await fetchPr(String(url ?? ""));
    const review =
      process.env.MURMUR_MOCK === "1"
        ? validateReview(mockRaw, files, text, [])
        : await generateReview(meta, files, text);
    return NextResponse.json({ review });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("review failed", e);
    const msg = e instanceof Error ? e.message : "";
    const friendly = /ANTHROPIC_API_KEY|no reviewable|malformed|didn't return/.test(msg)
      ? msg
      : "The review took too long or the model was busy. Your transcript is kept. Hit retry.";
    const status = (e as { status?: number })?.status;
    return NextResponse.json({ error: friendly, detail: `${status ?? ""} ${msg}`.trim().slice(0, 300) }, { status: 502 });
  }
}
