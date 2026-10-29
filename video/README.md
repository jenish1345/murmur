# Murmur demo film

The 118-second demo is generated from code: real footage of the live app, a canvas-animated film around it, synthesized music and sound effects, a spoken narration and styled captions. One shared timeline (`timeline.js`) drives picture and sound.

Needs Node 20+, Python 3 with NumPy and SciPy, ffmpeg, Google Chrome, and macOS (`say`) for the voice.

```bash
cd video && npm install --legacy-peer-deps
node capture-footage.mjs      # records the live site (real model call) + mobile stills
node dump-cues.mjs            # timeline -> out/cues.json
python3 audio.py              # music and sound effects
python3 voice.py              # narration, ducked mix, out/audio.wav, out/captions.srt
node render.mjs               # out/murmur-demo.mp4
node render.mjs --stills 12,50,100   # quick frame checks in out/qa/
```

`VOICE=Daniel RATE=165 python3 voice.py` swaps the narrator (any voice `say -v '?'` lists; the default is Rishi, Indian English).

## What is real and what is staged

- **Real:** every frame of the app in the "demo" scene is a recording of the live site, including the model call (3 comments in 3.9 s on the take used). The mobile screenshot is real too.
- **Staged:** the "hold the hotkey and talk" moment. Wispr Flow pastes the finished utterance when you release the hotkey, so the footage shows an empty box, then the text landing at once. The voice pill drawn over it is an illustration (the timer is sped up). For the submission, splice in your own screen recording of Flow dictating, since the form asks for a clip of Flow in use.
- **Illustrations:** the four "only Murmur" cards are animated explanations of real behaviour (the anchor check is `validateReview` in `src/lib/review.ts`).
- The typing-vs-speaking race uses commonly cited typical rates (about 40 and 150 words per minute), labelled as such on screen.
