import type { RawReview } from "./review";

/**
 * Local UI verification only: set MURMUR_MOCK=1 to skip the model call. Everything after the
 * model (anchor validation, quote matching, UI) still runs for real. Never set this in production.
 */
export const mockRaw: RawReview = {
  summary: "The fix is right: always compute the length, only guard the header. I'd like the empty-body case confirmed and a buffer-body test. Approve with small notes.",
  verdict: "approve",
  comments: [
    { file: "lib/response.js", line: 166, side: "RIGHT", severity: "praise", body: "Computing the length unconditionally is the correct split. This is what unblocks the ETag.", suggestedChange: null, sourceQuote: "Now it always works out the length and only guards the Content-Length header" },
    { file: "lib/response.js", line: 181, side: "RIGHT", severity: "praise", body: "Nice that the why-comment now sits right next to the set call.", suggestedChange: null, sourceQuote: "Moving the explanation about why you can't have both headers down next to the set call is good too" },
    { file: "lib/response.js", line: 166, side: "RIGHT", severity: "question", body: "What happens with an empty body when Transfer-Encoding is set? Do we still generate a weak ETag there?", suggestedChange: null, sourceQuote: "what happens with an empty body when Transfer-Encoding is set, do we still end up generating a weak ETag for that case" },
    { file: "test/res.send.js", line: 631, side: "RIGHT", severity: "nit", body: "The hard-coded ETag is brittle. A short comment on why this is the expected value would help.", suggestedChange: null, sourceQuote: "the hard coded ETag string is fine but it's a bit brittle" },
    { file: "test/res.send.js", line: 624, side: "RIGHT", severity: "suggestion", body: "Please add a Buffer body case too, it goes down a different branch.", suggestedChange: "res.set('Transfer-Encoding', 'chunked').send(Buffer.from('hello'));", sourceQuote: "I'd want a buffer body case as well since that goes down a different branch" },
    { file: "lib/nonexistent.js", line: 7, side: "RIGHT", severity: "nit", body: "Anchored to a line that doesn't exist, should be demoted.", suggestedChange: null, sourceQuote: "Overall I'd approve this, just those small things" },
  ],
  unmapped: [],
};
