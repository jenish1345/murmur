import { parseDiff, type DiffFile } from "./diff";

export type PrMeta = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  headSha: string;
  url: string;
  changedFiles: number;
  additions: number;
  deletions: number;
};

export type PrData = { meta: PrMeta; files: DiffFile[] };

export class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function parsePrUrl(input: string): { owner: string; repo: string; number: number } {
  const m = input.trim().match(/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/i);
  if (!m) throw new UserError("That doesn't look like a GitHub pull request URL (github.com/owner/repo/pull/123).");
  return { owner: m[1], repo: m[2], number: parseInt(m[3], 10) };
}

const cache = new Map<string, { at: number; data: PrData }>();
const TTL = 10 * 60 * 1000;

function headers(accept: string): HeadersInit {
  const h: Record<string, string> = { Accept: accept, "User-Agent": "murmur-pr-review", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function gh(url: string, accept: string): Promise<Response> {
  const res = await fetch(url, { headers: headers(accept), cache: "no-store" });
  if (res.status === 404) throw new UserError("Couldn't find that pull request. Is it public?", 404);
  if (res.status === 403 || res.status === 429) {
    throw new UserError("GitHub rate limit hit. Try again in a few minutes.", 429);
  }
  if (res.status === 406) throw new UserError("That pull request's diff is too large for GitHub to return.", 413);
  if (!res.ok) throw new UserError(`GitHub returned ${res.status}.`, 502);
  return res;
}

export async function fetchPr(input: string): Promise<PrData> {
  const { owner, repo, number } = parsePrUrl(input);
  const key = `${owner}/${repo}#${number}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const base = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
  const [metaRes, diffRes] = await Promise.all([
    gh(base, "application/vnd.github+json"),
    gh(base, "application/vnd.github.v3.diff"),
  ]);
  const j = await metaRes.json();
  const files = parseDiff(await diffRes.text());
  const data: PrData = {
    meta: {
      owner,
      repo,
      number,
      title: j.title,
      author: j.user?.login ?? "unknown",
      headSha: j.head?.sha ?? "",
      url: j.html_url,
      changedFiles: j.changed_files ?? files.length,
      additions: j.additions ?? 0,
      deletions: j.deletions ?? 0,
    },
    files,
  };
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 50) cache.delete(cache.keys().next().value!);
  return data;
}
