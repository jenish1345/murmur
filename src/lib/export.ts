import type { Review, ReviewComment } from "./review";

export type Decided = ReviewComment & { body: string };

const VERDICT_LABEL = { approve: "Approve", request_changes: "Request changes", comment: "Comment" } as const;

export function withSuggestion(c: Decided): string {
  return c.suggestedChange && c.side === "RIGHT" ? `${c.body}\n\n\`\`\`suggestion\n${c.suggestedChange}\n\`\`\`` : c.body;
}

export function toMarkdown(review: Review, comments: Decided[]): string {
  const out = [`## Review`, "", review.summary, "", `**Verdict:** ${VERDICT_LABEL[review.verdict]}`];
  const byFile = new Map<string, Decided[]>();
  for (const c of comments) byFile.set(c.file, [...(byFile.get(c.file) ?? []), c]);
  for (const [file, list] of byFile) {
    out.push("", `### \`${file}\``);
    for (const c of list) {
      out.push(`- **L${c.line} · ${c.severity}**: ${withSuggestion(c).replace(/\n/g, "\n  ")}`);
    }
  }
  out.push("", "_Spoken, not typed. Drafted with Murmur + Wispr Flow._");
  return out.join("\n");
}

export type GithubReviewPayload = {
  commit_id: string;
  body: string;
  event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
  comments: { path: string; line: number; side: "LEFT" | "RIGHT"; body: string }[];
};

export function toGithubPayload(review: Review, comments: Decided[], headSha: string): GithubReviewPayload {
  return {
    commit_id: headSha,
    body: review.summary,
    event: review.verdict === "approve" ? "APPROVE" : review.verdict === "request_changes" ? "REQUEST_CHANGES" : "COMMENT",
    comments: comments.map((c) => ({ path: c.file, line: c.line, side: c.side, body: withSuggestion(c) })),
  };
}
