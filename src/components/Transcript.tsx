"use client";

import type { Review } from "@/lib/review";

type Seg = { text: string; id: string | null; unmapped: boolean };

function segments(transcript: string, review: Review): Seg[] {
  const spans = [
    ...review.comments.filter((c) => c.quoteSpan).map((c) => ({ s: c.quoteSpan![0], e: c.quoteSpan![1], id: c.id, unmapped: false })),
    ...review.unmapped.filter((u) => u.quoteSpan).map((u) => ({ s: u.quoteSpan![0], e: u.quoteSpan![1], id: null, unmapped: true })),
  ].sort((a, b) => a.s - b.s);

  const out: Seg[] = [];
  let cursor = 0;
  for (const sp of spans) {
    if (sp.s < cursor) continue; // overlapping quotes: first one wins
    if (sp.s > cursor) out.push({ text: transcript.slice(cursor, sp.s), id: null, unmapped: false });
    out.push({ text: transcript.slice(sp.s, sp.e), id: sp.id, unmapped: sp.unmapped });
    cursor = sp.e;
  }
  if (cursor < transcript.length) out.push({ text: transcript.slice(cursor), id: null, unmapped: false });
  return out;
}

export function Transcript({
  transcript,
  review,
  activeId,
  onActivate,
}: {
  transcript: string;
  review: Review;
  activeId: string | null;
  onActivate: (id: string) => void;
}) {
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-[1.75]">
      {segments(transcript, review).map((s, i) =>
        s.id ? (
          <mark
            key={i}
            onClick={() => {
              onActivate(s.id!);
              document.getElementById(`cm-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className={`cursor-pointer rounded px-0.5 text-ink transition ${activeId === s.id ? "bg-accent text-accent-ink" : "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] hover:bg-[color-mix(in_srgb,var(--accent)_38%,transparent)]"}`}
          >
            {s.text}
          </mark>
        ) : s.unmapped ? (
          <span key={i} className="underline decoration-dashed decoration-muted underline-offset-4">
            {s.text}
          </span>
        ) : (
          <span key={i} className="text-muted">
            {s.text}
          </span>
        ),
      )}
    </p>
  );
}
