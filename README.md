# Murmur: review pull requests by talking

Built for **No Hands: The Wispr Challenge** (WeMakeDevs x Wispr Flow), Builders track.

Paste a public GitHub PR, talk through your review, and Murmur turns the ramble into precise inline comments. Every comment is pinned to a real line of the diff and linked to the exact sentence you said.

**Live:** _(add the Vercel URL)_ · **Demo video:** _(add link)_

## The problem

Writing review comments is slow and typing-heavy, and I lose the thread between reading the code and typing about it. Talking is 3-4x faster, but a spoken ramble can't be pasted into GitHub because it has no file or line context. Murmur is the missing mapping layer.

## How it works

1. **Fetch**: the PR diff comes from the GitHub REST API (public PRs, no sign-in) and is parsed into files, hunks and numbered lines.
2. **Map**: the diff, rendered with `R<n>` / `L<n>` line labels, and your transcript go to Claude with a forced tool call and a zod-validated schema. The model may only produce comments for points you actually said.
3. **Validate**: the trust layer. Every `file + side + line` must exist in the diff and every quote is located in your transcript. Failures are demoted to "couldn't pin to a line" instead of being shown at an invented anchor.
4. **Review**: inline comments with severity, edit/dismiss, click-through highlights from comment to the sentence you said.
5. **Export**: copy as markdown, or post as a real GitHub review (token stays in tab memory only).

Stateless: nothing is stored on the server. Per-IP and daily caps protect the demo key.

## How I used Wispr Flow

- **In the build:** the spec, every prompt to Claude Code, commit messages and docs were dictated. See [`docs/DICTATED.md`](docs/DICTATED.md) and [`docs/BUILD_PROMPT.md`](docs/BUILD_PROMPT.md).
- **In the product:** the entire input is dictated review speech. The textarea is designed for long dictation, and Flow types straight into it.
- **Usage proof:** _(add Wispr Insights screenshot and word count)_

## Judging criteria, with evidence

| Criterion | Evidence |
| --- | --- |
| Real problem in my work | Reviewing PRs is typing-heavy; Murmur removes the typing, keeps the line context. |
| Wispr used meaningfully | Product input is dictation; build was dictated end to end; usage card attached. |
| It works | Live link, no sign-in. "Load sample" runs a real PR in seconds. Anchors verified server-side, 7 unit tests. |
| Demo clarity | 2-minute video: paste PR, talk, comments land on the exact lines. |

## Run locally

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY (and optionally GITHUB_TOKEN)
npm run dev
npm test
```

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Required. Server-side only. |
| `GITHUB_TOKEN` | Optional. Raises the GitHub API rate limit for fetching public PRs. |
| `MURMUR_MODEL` | Optional. Defaults to `claude-sonnet-5-5`. |
| `MURMUR_PER_IP_HOURLY`, `MURMUR_DAILY_CAP` | Optional demo guards (default 12 / 400). |
| `MURMUR_MOCK=1` | Local UI testing only. Skips the model call. Never set in production. |

Stack: Next.js (App Router), TypeScript, Tailwind, Anthropic SDK, zod, Vitest.
