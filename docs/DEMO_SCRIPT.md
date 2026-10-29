# 2-minute demo script

Limit is 2 minutes. Aim for 1:50. Record in one or two takes, screen plus voice, at 1080p. The voice you hear in the video should be real: speak the review live with Wispr Flow so the Flow overlay is visible on screen.

## Before you record (10 minutes)

- [ ] Use a **real PR from your own work** if you can (a public PR you actually reviewed or opened). The 30% "real problem in your work" score rewards that over the sample. Keep the sample PR as the fallback.
- [ ] Open the PR yourself first and skim the diff so your spoken review is genuine.
- [ ] Browser at a normal desktop width, zoom 100%, dark or light mode is fine. Close other tabs and notifications.
- [ ] Wispr Flow running, hotkey known, mic tested. Make sure the Flow overlay is visible in the recording.
- [ ] Open Wispr Insights in the desktop app in a second window for the last shot.
- [ ] Do one dry run on the live site so the first request is warm.

## Shot list

| Time | On screen | Say (in your own words, dictated is better) |
| --- | --- | --- |
| 0:00-0:12 | Murmur landing page | "Reviewing a pull request means reading code and then typing out every comment. I lose the thread, and it's slow. I wanted to just talk through it, so I built Murmur." |
| 0:12-0:25 | Paste the PR link, diff loads | "I paste a pull request link. Murmur pulls the real diff. No sign-in." |
| 0:25-1:00 | Click the box, hold the Flow hotkey, **talk for ~30 seconds**. Flow overlay visible, text appears | Speak a natural review: name two or three files or functions, one thing you like, one worry, one question. Don't read from a script. Ramble a little. That's the point. |
| 1:00-1:10 | Click "Turn it into a review", the button animates | "Now Murmur maps what I said onto the actual lines." |
| 1:10-1:35 | Comments appear on the diff. Hover/scroll through 2-3 of them | "Each thought is pinned to the right line, with severity. And every comment keeps the exact sentence I said." |
| 1:35-1:48 | Click a highlighted phrase in "What you said": it scrolls to the comment | "Click what I said and it jumps to the comment. Nothing is invented: every line is checked against the real diff before I see it." |
| 1:48-1:55 | Click "Copy review" (and "Post to GitHub" if you have a token ready) | "One click and it's a real GitHub review." |
| 1:55-2:00 | Cut to Wispr Insights card | "Here's my Flow usage." (say only what your card shows) |

## Beats the judges are scoring

- **Real problem (30%)**: your first 12 seconds. Be specific and personal, not generic.
- **Wispr used meaningfully (30%)**: the Flow overlay in the 25-60s shot, plus the Insights card at the end. Only say you built by voice if the Insights card backs it up.
- **It works (25%)**: a live link on screen, a real PR, real comments landing on real lines.
- **Demo clarity (15%)**: one flow, no tangents, no jargon. Don't explain the architecture.

## Don'ts

- Don't open settings, tokens or the code. Skip the architecture.
- Don't pause on errors. If the model is slow, cut and re-record that part.
- Don't claim things that aren't true. Only say "the whole build was by voice" if it was.
- Don't go past 2:00.

## Also record (the form asks for it)

A **short clip of Flow in use**: 10-15 seconds, just you dictating into the Murmur textarea (or into Claude Code). You can lift this from the main recording.

## Fallback if the model is slow or errors on camera

Use the "Load sample" button: it runs a real PR with a sample ramble and returns in about 6 seconds. Say so honestly ("this is a sample ramble so you can try it without Flow").
