# Submission pack

Submit before **Fri 30 Oct, 11:59 pm IST** (the organizers' blog says the 30th, the event page says the 31st; use the earlier one). Track: **Builders**. Solo, one project.

## The four things the form asks for

1. **Link to the working project:** https://murmur-voice-review.netlify.app
2. **Demo video (max 2 min):** https://youtu.be/4f2QU6aUdDo  (backup: https://murmur-voice-review.netlify.app/demo)
3. **Wispr usage card screenshot:** _(from Insights in the desktop app)_
4. **A few lines on the problem, the target user, and how you used Wispr:** use the text below.

Also have ready: the GitHub repo link, and the short Flow-in-use clip (the blog lists it).

## Text for the form (edit the bracketed parts so it is true and in your voice)

**Project name:** Murmur

**One line:** Review pull requests by talking. Paste a PR, ramble your review, and Murmur pins every thought to the exact line of the diff, with the sentence you said attached.

**The problem:**
Writing code review comments is slow and typing-heavy, and I lose the thread between reading the code and typing about it. Talking is much faster, but a spoken ramble can't be pasted into GitHub because it has no file or line context. [Add one real example from your own work: a PR you reviewed, how long the comments took.]

**Target user:**
Developers who review pull requests, especially people who think faster out loud than they type: maintainers, team leads, solo builders reviewing their own changes.

**What it does:**
You paste a public GitHub PR link, talk through your review in a box built for dictation, and Murmur returns inline comments anchored to real lines, each with a severity (blocking, suggestion, nit, question, praise). Click what you said to jump to the comment. Copy the review as markdown or post it to GitHub as a real review. Every comment is checked against the actual diff before it is shown, and nothing is stored on the server. No sign-in.

**How I used Wispr Flow:**
- *In the product:* the whole input is dictated review speech. The textarea is designed for long dictation and Flow types straight into it.
- *In the build:* [Say exactly which parts you dictated, e.g. "the Flow clip, the README section and this submission text". Keep `docs/DICTATED.md` backing it up.]
- *Usage:* [Update to the number on your latest Insights card. At the first screenshot: 84 words dictated, 144 words per minute.]

**Why it fits the judging criteria:**

| Criterion | Evidence |
| --- | --- |
| Real problem in my work | Reviewing PRs is typing-heavy; Murmur removes the typing and keeps the line context. |
| Wispr used meaningfully | Dictation is the product's only input, designed around how Flow pastes finished speech. Usage card and Flow clip attached. |
| It works | Live link, no sign-in. "Load sample" runs a real PR in about 6 seconds. Anchors are verified server-side and covered by unit tests. |
| Demo clear | One 2-minute flow: paste, talk, comments land on the lines. |

**Stack:** Next.js, TypeScript, Tailwind, Claude via the Anthropic SDK, zod, Vitest.

## Optional social post (the page lists a social prize ranked by how clearly a post shows a real workflow)

Draft, then edit and post it yourself with a screen recording or the demo clip attached:

> I review PRs by talking now. Paste a GitHub PR, ramble through what you noticed with @WisprFlow, and Murmur pins each thought to the exact line of the diff, with the sentence you said attached. Made for #NoHandsChallenge with @WeMakeDevs.
> [live link]

## Final checklist

- [ ] Live link opens in a private window and the sample runs end to end.
- [ ] Add your own `ANTHROPIC_API_KEY` in Netlify so the demo doesn't depend on the injected key. Then re-run the sample.
- [ ] README has the demo video link and the Wispr usage numbers (the placeholders are marked).
- [ ] `docs/DICTATED.md` contains real dictated excerpts.
- [ ] Repo pushed to GitHub and public.
- [ ] Demo video under 2:00, shows the Flow overlay.
- [ ] Wispr Insights screenshot saved.
- [ ] Submitted at wemakedevs.org/wispr/submit. Screenshot the confirmation.
- [ ] Weekly check-in uploaded if the page still asks for it.
- [ ] Scores are public on 4 Nov. Questions on scores are open until 5 Nov.
