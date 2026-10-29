import { describe, expect, it } from "vitest";
import { formatForModel, parseDiff, validAnchors, anchorKey } from "./diff";
import { findQuote, validateReview, type RawReview } from "./review";

const DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index 111..222 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,5 +10,7 @@ export function verify(token: string) {
   const parts = token.split(".");
   if (parts.length !== 3) return null;
-  const payload = decode(parts[1]);
+  const payload = decode(parts[1]);
+  // no expiry check
+  return payload;
   return null;
 }
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,1 +1,1 @@
-a
+b
diff --git a/logo.png b/logo.png
Binary files a/logo.png and b/logo.png differ
`;

describe("parseDiff", () => {
  const files = parseDiff(DIFF);

  it("finds files, statuses and counts", () => {
    expect(files.map((f) => f.path)).toEqual(["src/auth.ts", "package-lock.json", "logo.png"]);
    expect(files[0].additions).toBe(3);
    expect(files[0].deletions).toBe(1);
    expect(files[2].binary).toBe(true);
  });

  it("tracks new and old line numbers", () => {
    const lines = files[0].hunks[0].lines;
    expect(lines[0]).toMatchObject({ kind: "ctx", oldNo: 10, newNo: 10 });
    expect(lines.find((l) => l.kind === "del")).toMatchObject({ oldNo: 12, newNo: null });
    expect(lines.filter((l) => l.kind === "add").map((l) => l.newNo)).toEqual([12, 13, 14]);
  });

  it("builds the anchor set", () => {
    const a = validAnchors(files);
    expect(a.has(anchorKey("src/auth.ts", "RIGHT", 13))).toBe(true);
    expect(a.has(anchorKey("src/auth.ts", "LEFT", 12))).toBe(true);
    expect(a.has(anchorKey("src/auth.ts", "RIGHT", 99))).toBe(false);
    expect(a.has(anchorKey("nope.ts", "RIGHT", 13))).toBe(false);
  });

  it("skips lockfiles and binaries for the model", () => {
    const m = formatForModel(files);
    expect(m.omitted).toEqual(["package-lock.json", "logo.png"]);
    expect(m.text).toMatch(/R13 \+\s+\/\/ no expiry check/);
    expect(m.text).toContain("L12 - ");
  });
});

describe("findQuote", () => {
  const t = "Okay so in the auth file, the token check — it never looks at expiry. Also fine.";
  it("matches ignoring case and punctuation and returns real offsets", () => {
    const span = findQuote(t, "the token check it never looks at EXPIRY")!;
    expect(t.slice(span[0], span[1])).toBe("the token check — it never looks at expiry");
  });
  it("returns null for paraphrases", () => {
    expect(findQuote(t, "tokens are never expired anywhere")).toBeNull();
  });
});

describe("validateReview", () => {
  const files = parseDiff(DIFF);
  const transcript = "The token check in auth never looks at expiry. Also the naming is a bit off.";
  const raw: RawReview = {
    summary: "s",
    verdict: "request_changes",
    comments: [
      { file: "src/auth.ts", line: 13, side: "RIGHT", severity: "blocking", body: "Check expiry.", suggestedChange: null, sourceQuote: "token check in auth never looks at expiry" },
      { file: "src/auth.ts", line: 999, side: "RIGHT", severity: "nit", body: "Rename this.", suggestedChange: null, sourceQuote: "the naming is a bit off" },
      { file: "ghost.ts", line: 1, side: "RIGHT", severity: "nit", body: "Invented.", suggestedChange: null, sourceQuote: "made up words here" },
    ],
    unmapped: [],
  };

  it("keeps real anchors and demotes invented ones", () => {
    const r = validateReview(raw, files, transcript, []);
    expect(r.comments).toHaveLength(1);
    expect(r.comments[0].quoteSpan).not.toBeNull();
    expect(r.unmapped).toHaveLength(2);
  });
});
