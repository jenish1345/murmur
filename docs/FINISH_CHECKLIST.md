# Finish line: about 25 minutes of your time

Deadline: **Fri 30 Oct, 11:59 pm IST** (the blog's date; the event page says the 31st). Do these in order.

## 1. Record your real Flow clip (5 min)
The film's "talk" moment is staged. The form asks for a clip of Flow in use, so record the real thing.
1. Open https://murmur-voice-review.netlify.app, paste a public PR link (or click the sample button).
2. Start a screen recording: `Cmd + Shift + 5` > Record Selected Portion (include the Flow overlay).
3. Click the big box, hold your Flow hotkey, and talk for 20-30 seconds about the PR. Release. Click "Turn it into a review".
4. Stop the recording. Save it as `flow-clip.mov`. This is your "clip of Flow in use". Submit it separately; the film already uses the 2-minute budget.

## 2. Wispr Insights screenshot (1 min)
Open Wispr Flow > Insights, screenshot the usage card. Note the word count.

## 3. Upload the film (4 min)
File: `video/out/murmur-demo.mp4` (plays in QuickTime). Upload to YouTube as **Unlisted** using the text in `video/YOUTUBE.md`. Copy the link.

## 4. Your own model key (2 min, optional but safer)
The live demo currently uses a key that Netlify injects. To use your own:
```bash
cd /Users/antonyjenish/Documents/jen_projects/murmur
netlify env:set ANTHROPIC_API_KEY   # paste your key when prompted
mv .env.local ../.murmur.env.local.bak; netlify deploy --prod --build; mv ../.murmur.env.local.bak .env.local
```
Then open the live site and run the sample once.

## 5. Fill the placeholders (3 min)
- `README.md`: demo video link, Wispr usage numbers.
- `docs/SUBMISSION.md`: your real example, what share of the build you dictated, word count.
- `docs/DICTATED.md`: paste a few real dictated excerpts (a prompt you dictated, a commit message).
Only write what is true. Then `git add -A && git commit -m "Add video link and Wispr proof" && git push`.

## 6. Submit (5 min)
https://www.wemakedevs.org/wispr/submit needs:
1. Project link: https://murmur-voice-review.netlify.app
2. Demo video (max 2 min): the YouTube link
3. Wispr usage card screenshot
4. A few lines on the problem, target user and how you used Wispr: copy from `docs/SUBMISSION.md`
Also: repo link https://github.com/jenish1345/murmur and the Flow clip if the form has a slot for it. Screenshot the confirmation.
