// Writes out/cues.json for the audio synthesiser from the shared timeline (reads footage marks so sound lands on real moments).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { setMarks, buildCues, MUSIC, TOTAL, VO, RESOLVE_AT } from './timeline.js';
mkdirSync('out', { recursive: true });
setMarks(JSON.parse(readFileSync('footage/marks.json', 'utf8')).marks);
const cues = buildCues();
writeFileSync('out/cues.json', JSON.stringify({ total: TOTAL, resolveAt: RESOLVE_AT, cues, music: MUSIC, vo: VO }, null, 1));
console.log(`cues: ${cues.length}, music sections: ${MUSIC.length}, total ${TOTAL}s`);
