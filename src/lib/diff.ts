export type Side = "LEFT" | "RIGHT";

export type DiffLine = {
  kind: "add" | "del" | "ctx";
  oldNo: number | null;
  newNo: number | null;
  text: string;
};

export type DiffHunk = { header: string; lines: DiffLine[] };

export type DiffFile = {
  path: string;
  status: "added" | "deleted" | "modified" | "renamed";
  binary: boolean;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
};

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseDiff(raw: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = raw.split("\n");
  let file: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  let oldLeft = 0;
  let newLeft = 0;

  for (const line of lines) {
    if (hunk && (oldLeft > 0 || newLeft > 0)) {
      const c = line[0];
      if (c === "\\") continue;
      if (c === "+") {
        hunk.lines.push({ kind: "add", oldNo: null, newNo: newNo++, text: line.slice(1) });
        newLeft--;
        file!.additions++;
        continue;
      }
      if (c === "-") {
        hunk.lines.push({ kind: "del", oldNo: oldNo++, newNo: null, text: line.slice(1) });
        oldLeft--;
        file!.deletions++;
        continue;
      }
      if (c === " " || line === "") {
        hunk.lines.push({ kind: "ctx", oldNo: oldNo++, newNo: newNo++, text: line.slice(1) });
        oldLeft--;
        newLeft--;
        continue;
      }
    }

    if (line.startsWith("diff --git ")) {
      const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      file = {
        path: m ? m[2] : line.slice(11),
        status: "modified",
        binary: false,
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      files.push(file);
      hunk = null;
      oldLeft = newLeft = 0;
      continue;
    }
    if (!file) continue;

    if (line.startsWith("new file mode")) file.status = "added";
    else if (line.startsWith("deleted file mode")) file.status = "deleted";
    else if (line.startsWith("rename to ")) {
      file.status = "renamed";
      file.path = line.slice(10);
    } else if (line.startsWith("Binary files") || line.startsWith("GIT binary patch")) {
      file.binary = true;
    } else if (line.startsWith("+++ ") && line !== "+++ /dev/null") {
      file.path = line.slice(4).replace(/^b\//, "");
    } else {
      const h = line.match(HUNK_RE);
      if (h) {
        oldNo = parseInt(h[1], 10);
        oldLeft = h[2] === undefined ? 1 : parseInt(h[2], 10);
        newNo = parseInt(h[3], 10);
        newLeft = h[4] === undefined ? 1 : parseInt(h[4], 10);
        hunk = { header: line, lines: [] };
        file.hunks.push(hunk);
      }
    }
  }
  return files;
}

export const anchorKey = (file: string, side: Side, line: number) => `${file}:${side}:${line}`;

/** Every (file, side, line) a GitHub review comment can legally attach to. */
export function validAnchors(files: DiffFile[]): Set<string> {
  const set = new Set<string>();
  for (const f of files) {
    for (const h of f.hunks) {
      for (const l of h.lines) {
        if (l.newNo !== null) set.add(anchorKey(f.path, "RIGHT", l.newNo));
        if (l.oldNo !== null) set.add(anchorKey(f.path, "LEFT", l.oldNo));
      }
    }
  }
  return set;
}

const SKIP = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|go\.sum)$|\.(min\.js|map|svg|png|jpe?g|gif|ico|woff2?)$/;

export type ModelDiff = { text: string; omitted: string[] };

/**
 * Compact, line-labelled rendering of the diff for the model. `R42` is line 42 of the
 * new file, `L41` is line 41 of the old file (deleted lines only), so the model can
 * copy labels instead of counting.
 */
export function formatForModel(files: DiffFile[], maxChars = 150_000): ModelDiff {
  const out: string[] = [];
  const omitted: string[] = [];
  let used = 0;
  for (const f of files) {
    if (f.binary || SKIP.test(f.path) || f.hunks.length === 0) {
      omitted.push(f.path);
      continue;
    }
    const body: string[] = [`### ${f.path} (${f.status}, +${f.additions} -${f.deletions})`];
    for (const h of f.hunks) {
      body.push(h.header);
      for (const l of h.lines) {
        if (l.kind === "del") body.push(`L${l.oldNo} - ${l.text}`);
        else if (l.kind === "add") body.push(`R${l.newNo} + ${l.text}`);
        else body.push(`R${l.newNo}   ${l.text}`);
      }
    }
    const chunk = body.join("\n");
    if (used + chunk.length > maxChars) {
      omitted.push(f.path);
      continue;
    }
    used += chunk.length;
    out.push(chunk);
  }
  return { text: out.join("\n\n"), omitted };
}
