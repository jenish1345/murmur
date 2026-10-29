import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anchorKey, formatForModel, validAnchors, type DiffFile, type Side } from "./diff";
import type { PrMeta } from "./github";

export const SEVERITIES = ["blocking", "suggestion", "nit", "question", "praise"] as const;
export type Severity = (typeof SEVERITIES)[number];

const RawComment = z.object({
  file: z.string().describe("Path exactly as in the diff headings"),
  line: z.number().int().describe("Number from the R<n> / L<n> label of the target line"),
  side: z.enum(["RIGHT", "LEFT"]).describe("RIGHT for R labels (new code), LEFT for L labels (deleted code)"),
  severity: z.enum(SEVERITIES),
  body: z.string().describe("The review comment, in the reviewer's voice, concise"),
  suggestedChange: z.string().nullable().describe("Replacement code only if the reviewer stated one, else null"),
  sourceQuote: z.string().describe("Verbatim contiguous words from the transcript that this comment came from"),
});

export const RawReview = z.object({
  summary: z.string().describe("2-3 sentence review summary in the reviewer's voice"),
  verdict: z.enum(["approve", "request_changes", "comment"]),
  comments: z.array(RawComment),
  unmapped: z.array(
    z.object({
      sourceQuote: z.string(),
      note: z.string().describe("Why this couldn't be tied to a line"),
    }),
  ),
});
export type RawReview = z.infer<typeof RawReview>;

export type ReviewComment = {
  id: string;
  file: string;
  line: number;
  side: Side;
  severity: Severity;
  body: string;
  suggestedChange: string | null;
  sourceQuote: string;
  /** Character offsets of the quote inside the transcript, null if it was paraphrased. */
  quoteSpan: [number, number] | null;
};

export type Review = {
  summary: string;
  verdict: RawReview["verdict"];
  comments: ReviewComment[];
  unmapped: { sourceQuote: string; note: string; quoteSpan: [number, number] | null }[];
  omittedFiles: string[];
};

const alnum = /[a-z0-9]/;

/** Locate `quote` inside `transcript` ignoring case, punctuation and spacing. */
export function findQuote(transcript: string, quote: string): [number, number] | null {
  const norm = (s: string) => {
    let text = "";
    const map: number[] = [];
    const lower = s.toLowerCase();
    for (let i = 0; i < lower.length; i++) {
      if (alnum.test(lower[i])) {
        text += lower[i];
        map.push(i);
      }
    }
    return { text, map };
  };
  const t = norm(transcript);
  const q = norm(quote);
  if (q.text.length < 6) return null;
  const at = t.text.indexOf(q.text);
  if (at < 0) return null;
  return [t.map[at], t.map[at + q.text.length - 1] + 1];
}

/**
 * The trust layer: nothing reaches the UI unless its anchor exists in the diff.
 * Comments that fail are demoted to `unmapped` rather than shown at a made-up line.
 */
export function validateReview(raw: RawReview, files: DiffFile[], transcript: string, omittedFiles: string[]): Review {
  const anchors = validAnchors(files);
  const comments: ReviewComment[] = [];
  const unmapped: Review["unmapped"] = raw.unmapped.map((u) => ({ ...u, quoteSpan: findQuote(transcript, u.sourceQuote) }));

  raw.comments.forEach((c, i) => {
    const span = findQuote(transcript, c.sourceQuote);
    if (!anchors.has(anchorKey(c.file, c.side, c.line))) {
      unmapped.push({
        sourceQuote: c.sourceQuote,
        note: `Couldn't pin "${c.body.slice(0, 80)}" to a real line (${c.file}:${c.line}).`,
        quoteSpan: span,
      });
      return;
    }
    comments.push({ ...c, id: `c${i}`, quoteSpan: span, sourceQuote: span ? transcript.slice(span[0], span[1]) : c.sourceQuote });
  });

  comments.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return { summary: raw.summary, verdict: raw.verdict, comments, unmapped, omittedFiles };
}

const SYSTEM = `You turn a developer's spoken code review into precise, line-anchored GitHub review comments.

The reviewer dictated their thoughts out loud while reading a pull request. The transcript is rambling, may contain dictation errors (homophones, mangled identifiers) and refers to code loosely ("the retry loop", "that token check"). Your job is to find the code they mean and attach each of their points to the right line.

Rules:
- Only produce comments for points the reviewer actually made. Never add your own findings, praise or criticism. If the reviewer didn't say it, it doesn't exist.
- Write each comment in the reviewer's voice, first person, concise and specific. Fix obvious dictation errors using the identifiers in the diff.
- One comment per distinct point. Anchor it to the single most relevant line: use the number from its R<n> label (RIGHT, new code) or L<n> label (LEFT, deleted code). Copy the file path exactly from the "###" headings.
- sourceQuote must be a verbatim, contiguous excerpt (under 200 characters) copied from the transcript.
- severity: blocking = must fix before merge; suggestion = recommended change; nit = minor style; question = asking the author; praise = positive feedback. Infer it from the reviewer's tone and words.
- suggestedChange only when the reviewer spelled out replacement code; otherwise null.
- If a point can't be confidently tied to a line in this diff, put it in "unmapped" instead of guessing.
- verdict: approve / request_changes only if the reviewer said or clearly implied it; otherwise "comment".
- summary: 2-3 sentences capturing the overall review as the reviewer would say it.`;

let client: Anthropic | null = null;

export async function generateReview(
  meta: PrMeta,
  files: DiffFile[],
  transcript: string,
): Promise<Review> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Server is missing ANTHROPIC_API_KEY.");
  }
  client ??= new Anthropic({ timeout: 55_000, maxRetries: 1 });
  const { text, omitted } = formatForModel(files);
  if (!text) throw new Error("This pull request has no reviewable text changes.");

  const { $schema: _ignored, ...schema } = z.toJSONSchema(RawReview) as Record<string, unknown>;
  void _ignored;

  const res = await client.messages.create({
    model: process.env.MURMUR_MODEL || "claude-sonnet-5-5",
    max_tokens: 6000,
    system: SYSTEM,
    tools: [
      {
        name: "submit_review",
        description: "Submit the structured review built from the reviewer's spoken transcript.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "submit_review" },
    messages: [
      {
        role: "user",
        content:
          `Pull request: ${meta.owner}/${meta.repo}#${meta.number} "${meta.title}" by ${meta.author}\n\n` +
          `<diff>\n${text}\n</diff>\n\n<transcript>\n${transcript}\n</transcript>`,
      },
    ],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("The model didn't return a review.");
  const parsed = RawReview.safeParse(block.input);
  if (!parsed.success) throw new Error("The model returned a malformed review. Please retry.");
  return validateReview(parsed.data, files, transcript, omitted);
}
