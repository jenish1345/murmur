import { NextResponse } from "next/server";
import { fetchPr, UserError } from "@/lib/github";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const { meta, files } = await fetchPr(String(url ?? ""));
    // Cap what we ship to the browser so a huge PR can't freeze the page.
    const slim = files.slice(0, 40).map((f) => ({
      ...f,
      hunks: f.hunks.map((h) => ({ ...h, lines: h.lines.slice(0, 400) })),
    }));
    return NextResponse.json({ meta, files: slim, truncatedFiles: Math.max(0, files.length - slim.length) });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Couldn't load that pull request." }, { status: 500 });
  }
}
