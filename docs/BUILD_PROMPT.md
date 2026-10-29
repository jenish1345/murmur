# Paste this into Claude Code (dictate it with Wispr Flow, don't type it)

You are my build partner for "No Hands: The Wispr Challenge" (WeMakeDevs x Wispr Flow), Builders track. I have about 5 hours. The deadline is 30 Oct 11:59 pm IST (the blog says the 30th, the page says the 31st, so treat the 30th as real). Only first prize matters. Build to win, not to demo.

## Project: Murmur — review pull requests by talking

**One-liner:** Paste a GitHub PR link, talk through your review out loud, and Murmur turns the ramble into precise inline review comments anchored to the right lines of the diff. Every comment links back to the exact sentence you said.

**The real problem (my own work):** Writing review comments is slow, typing-heavy, and I lose the thread. Talking is 3-4x faster, but a spoken ramble can't be pasted into GitHub because it has no file or line context. Murmur is the missing mapping layer.

## How the judges score (design every decision against this)
- 30% Real problem in my own work: specific problem, clear user, a tool I would keep using.
- 30% Wispr used meaningfully: Wispr Flow is part of the build AND the product workflow, and the demo and usage card show it.
- 25% It works: a live link judges can open and use with NO sign-in and NO payment.
- 15% Demo clarity: a 2-minute video anyone can follow.
Judges are the WeMakeDevs founder/COO/CMO and Wispr's India growth lead. They are not code reviewers. Polish, a crisp story, visible Wispr use and a flawless live link beat clever architecture. Every score and comment is public.

## Product spec
1. **Input page** (no auth): PR URL field + a big "Talk through your review" textarea sized for long dictation (Wispr Flow types into any text field, so a plain textarea is the right control). Show a live word counter ("412 words spoken") and a one-line hint: "Hold your Flow hotkey and just talk."
2. **Fetch**: server-side fetch of the PR diff and metadata from the GitHub REST API (public PRs, unauthenticated; use an optional server env GITHUB_TOKEN to lift rate limits; cache per PR + head SHA). Parse the unified diff into files > hunks > numbered lines with stable ids.
3. **Map**: send the numbered diff and the transcript to Claude (model `claude-sonnet-5-5`, structured output validated with zod). Output: `summary`, `verdict` (approve | request_changes | comment), and `comments[]` each with `file`, `line`, `side`, `severity` (blocking | suggestion | nit | question | praise), `body`, optional `suggestedChange`, and `sourceQuote` (the verbatim sentence from my transcript). Also return `unmapped[]` for things I said that don't map to any line.
4. **Validate (this is the "It works" insurance)**: server-side check that every `file`+`line` really exists in the diff and every `sourceQuote` is a real substring of the transcript. Drop or move failures into `unmapped`. Never show an invented anchor.
5. **Review UI**: split view with the diff on one side and comments anchored inline. Click a comment to highlight the spoken sentence it came from (traceability builds trust). Edit, accept or reject each comment. Show severity chips and the verdict.
6. **Export**: "Copy as GitHub review markdown" (works with no auth). Optional "Post to GitHub" using a fine-grained token the user pastes, kept in memory only and never stored.
7. **Try it without Wispr**: a "Load sample" button that fills in a real public PR plus a sample transcript so a judge gets a result in 10 seconds.
8. **Failure handling**: LLM timeout/rate limit shows a friendly retry and keeps the transcript. Per-IP rate limit and a daily cap so the key can't be drained. No DB needed (stateless).

## Stack
Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. Anthropic SDK (use the claude-api skill for correct usage; key only in env, never client). Keep it stateless. Design it properly (use the frontend-design skill): clean, confident, one memorable visual idea (the waveform-to-diff motif), light and dark.

## Plan (commit after each milestone, deploy early)
- 0:00-0:30 scaffold, repo, deploy a hello-world to Vercel immediately so the live URL exists.
- 0:30-1:30 PR fetch + diff parser + tests.
- 1:30-2:30 LLM mapping + validator + tests (feed it 3 real public PRs, including one with a multi-file change).
- 2:30-3:30 review UI, quote traceability, export, sample loader.
- 3:30-4:00 error states, rate limits, mobile check, README.
- 4:00-4:45 demo video, usage card, submission text.
- 4:45-5:00 buffer. SUBMIT EARLY, then improve.

## Wispr proof (30% of the score, don't skip)
- Keep `docs/DICTATED.md` with the actual dictated spec, prompts, commit messages and issue text. Note which parts were dictated.
- README section "How I used Wispr Flow": in the build (every prompt to Claude Code, commits, docs) and in the product (the whole input is dictated review speech).
- Dogfood: use Murmur to review one of its own PRs and show that in the demo.
- I will screenshot my Wispr Insights usage card and record a short clip of Flow in use.

## 2-minute demo script (build the app so this plays smoothly)
0:00 problem in one sentence (review comments are slow to type). 0:10 paste PR link. 0:20 show the Flow hotkey and talk a 30-second review. 0:55 comments land on the exact lines. 1:20 click a comment, the spoken quote highlights. 1:35 copy or post the review. 1:50 Wispr Insights card with word count and the one-line takeaway.

## Submission text (draft at the end)
Problem, target user (developers who review PRs), how Wispr was used, live link, repo link, a rubric-mapping table (the four criteria with evidence).

## Working rules
Verify in the browser as you go. Run the tests. Tell me plainly when something doesn't work. Don't add features beyond this spec until the live link is submitted. Start now: scaffold the repo, deploy hello-world, then proceed milestone by milestone.
