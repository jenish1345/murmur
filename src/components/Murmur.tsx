"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiffFile } from "@/lib/diff";
import type { PrMeta } from "@/lib/github";
import type { Review } from "@/lib/review";
import { toGithubPayload, toMarkdown, type Decided } from "@/lib/export";
import { SAMPLE_PR, SAMPLE_TRANSCRIPT } from "@/lib/sample";
import { DiffView } from "./DiffView";
import { Transcript } from "./Transcript";
import { Motif } from "./Motif";

type PrResp = { meta: PrMeta; files: DiffFile[]; truncatedFiles: number };

const PR_RE = /github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i;
const DRAFT_KEY = "murmur.draft";
const VERDICT = { approve: "Approve", request_changes: "Request changes", comment: "Comment" } as const;

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export default function Murmur() {
  const [url, setUrl] = useState("");
  const [pr, setPr] = useState<PrResp | null>(null);
  const [prBusy, setPrBusy] = useState(false);
  const [prError, setPrError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [focused, setFocused] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewedText, setReviewedText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [took, setTook] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [talking, setTalking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("");
  const [posting, setPosting] = useState<"idle" | "busy" | "done" | string>("idle");
  const loadedUrl = useRef("");
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) setTranscript(d);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, transcript);
    } catch {}
  }, [transcript]);

  const loadPr = useCallback(async (u: string) => {
    if (!PR_RE.test(u) || loadedUrl.current === u) return;
    loadedUrl.current = u;
    setPrBusy(true);
    setPrError("");
    setReview(null);
    setTalking(true);
    try {
      const res = await fetch("/api/pr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Couldn't load that pull request.");
      setPr(j);
      setTimeout(() => textRef.current?.focus(), 50);
    } catch (e) {
      loadedUrl.current = "";
      setPr(null);
      setPrError(e instanceof Error ? e.message : "Couldn't load that pull request.");
    } finally {
      setPrBusy(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadPr(url.trim()), 350);
    return () => clearTimeout(t);
  }, [url, loadPr]);

  async function run() {
    if (!pr) return;
    setBusy(true);
    setError("");
    const t0 = performance.now();
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: pr.meta.url, transcript }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      setReview(j.review);
      setReviewedText(transcript);
      setRejected(new Set());
      setEdits({});
      setActive(null);
      setTalking(false);
      setPosting("idle");
      setTook((performance.now() - t0) / 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function loadSample() {
    setTranscript(SAMPLE_TRANSCRIPT);
    setUrl(SAMPLE_PR);
    if (pr && loadedUrl.current === SAMPLE_PR) setTalking(true);
    else void loadPr(SAMPLE_PR);
  }

  const accepted: Decided[] = useMemo(
    () => (review ? review.comments.filter((c) => !rejected.has(c.id)).map((c) => ({ ...c, body: edits[c.id] ?? c.body })) : []),
    [review, rejected, edits],
  );

  async function copyMd() {
    if (!review) return;
    await navigator.clipboard.writeText(toMarkdown(review, accepted));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function post() {
    if (!review || !pr) return;
    setPosting("busy");
    try {
      const { owner, repo, number, headSha } = pr.meta;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "content-type": "application/json" },
        body: JSON.stringify(toGithubPayload(review, accepted, headSha)),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "GitHub rejected the review.");
      setPosting("done");
    } catch (e) {
      setPosting(e instanceof Error ? e.message : "Couldn't post the review.");
    }
  }

  const words = wordCount(transcript);

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-16 sm:px-6">
      <header className="flex items-center gap-3 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          <div className="flex h-3.5 items-center gap-[2px]">
            {[0.5, 1, 0.65, 0.9].map((h, i) => (
              <span key={i} className="w-[2.5px] rounded-full bg-accent-ink" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        </div>
        <span className="font-display text-2xl font-semibold tracking-tight">Murmur</span>
        <span className="hidden text-sm text-muted sm:inline">review pull requests by talking</span>
        <a href="https://wisprflow.ai" target="_blank" rel="noreferrer" className="ml-auto rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink">
          built with Wispr Flow
        </a>
      </header>

      {!pr && (
        <section className="grid items-center gap-10 pt-6 lg:grid-cols-[1.1fr_1fr] lg:pt-14">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
              Say it.
              <br />
              <span className="text-accent">Ship the review.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Paste a pull request, talk through what you noticed, and Murmur pins every thought to the exact line, with the sentence you said attached.
              No typing, no losing the thread.
            </p>
            <div className="mt-8 flex max-w-2xl flex-col gap-3">
              <label htmlFor="pr" className="text-sm font-medium">GitHub pull request</label>
              <div className="flex gap-2">
                <input
                  id="pr"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-card px-4 py-3 font-mono text-sm outline-none focus:border-accent"
                  autoFocus
                />
                <button
                  onClick={() => loadPr(url.trim())}
                  disabled={prBusy || !PR_RE.test(url)}
                  className="rounded-xl bg-ink px-5 text-sm font-semibold text-paper disabled:opacity-40"
                >
                  {prBusy ? "Loading…" : "Load"}
                </button>
              </div>
              {prError && <p className="text-sm text-accent" role="alert">{prError}</p>}
              <button onClick={loadSample} className="w-fit text-sm text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
                No Wispr handy? Try a real PR with a sample ramble →
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <Motif className="w-full" />
            <p className="mt-3 text-center text-sm text-muted">your voice, resolved into line-level review</p>
          </div>
        </section>
      )}

      {pr && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
              <a href={pr.meta.url} target="_blank" rel="noreferrer" className="font-display text-xl font-semibold hover:underline">
                {pr.meta.title}
              </a>
              <span className="font-mono text-xs text-muted">
                {pr.meta.owner}/{pr.meta.repo}#{pr.meta.number} · {pr.meta.author} · {pr.meta.changedFiles} files
              </span>
              <button onClick={() => { setPr(null); setReview(null); setUrl(""); loadedUrl.current = ""; }} className="ml-auto text-xs text-muted underline">
                change PR
              </button>
            </div>
            <DiffView
              files={pr.files}
              comments={review?.comments ?? []}
              rejected={rejected}
              edits={edits}
              activeId={active}
              onActivate={setActive}
              onEdit={(id, b) => setEdits((e) => ({ ...e, [id]: b }))}
              onToggleReject={(id) =>
                setRejected((s) => {
                  const n = new Set(s);
                  if (n.has(id)) n.delete(id);
                  else n.add(id);
                  return n;
                })
              }
            />
            {pr.truncatedFiles > 0 && <p className="mt-3 text-sm text-muted">+{pr.truncatedFiles} more files not shown.</p>}
          </div>

          <aside className="order-1 lg:order-2">
            <div className="rounded-2xl border border-line bg-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              {talking || !review ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className={`h-2.5 w-2.5 rounded-full bg-accent ${focused ? "mic-live" : ""}`} />
                    Talk through your review
                  </div>
                  <p className="mt-1 text-sm text-muted">Click in, hold your Wispr Flow hotkey, and ramble. Mention files, functions, what worries you.</p>
                  <textarea
                    ref={textRef}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="“So in the auth file, the token check never looks at expiry…”"
                    rows={12}
                    className="mt-3 w-full resize-y rounded-xl border border-line bg-paper p-3 text-[15px] leading-relaxed outline-none focus:border-accent"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>{words} words spoken</span>
                    <button onClick={loadSample} className="underline decoration-dotted underline-offset-2 hover:text-ink">use sample ramble</button>
                  </div>
                  {error && (
                    <p className="mt-3 rounded-lg bg-[var(--del-bg)] p-2.5 text-sm text-[var(--del-fg)]" role="alert">{error}</p>
                  )}
                  <button
                    onClick={run}
                    disabled={busy || words < 8}
                    className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink transition disabled:opacity-40"
                  >
                    {busy ? "Pinning your words to the diff…" : error ? "Retry" : "Turn it into a review"}
                  </button>
                  {review && (
                    <button onClick={() => setTalking(false)} className="mt-2 w-full text-sm text-muted underline">back to the review</button>
                  )}
                </>
              ) : (
                <div className="rise">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-paper">{VERDICT[review.verdict]}</span>
                    <span className="text-xs text-muted">
                      {wordCount(reviewedText)} words → {review.comments.length} comments · {took.toFixed(1)}s
                    </span>
                  </div>
                  <p className="mt-3 font-display text-lg leading-snug">{review.summary}</p>

                  <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted">What you said</h3>
                  <div className="mt-2 rounded-xl bg-paper p-3">
                    <Transcript transcript={reviewedText} review={review} activeId={active} onActivate={setActive} />
                  </div>
                  <p className="mt-2 text-xs text-muted">Highlights are linked to comments on the diff. Click one to jump.</p>

                  {review.unmapped.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Couldn’t pin to a line</h3>
                      <ul className="mt-2 space-y-2 text-sm">
                        {review.unmapped.map((u, i) => (
                          <li key={i} className="rounded-lg border border-dashed border-line p-2">
                            <span className="italic">“{u.sourceQuote}”</span>
                            <div className="text-xs text-muted">{u.note}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button onClick={copyMd} className="rounded-xl bg-ink py-2.5 text-sm font-semibold text-paper">
                      {copied ? "Copied ✓" : `Copy review (${accepted.length})`}
                    </button>
                    <button onClick={() => setTalking(true)} className="rounded-xl border border-line py-2.5 text-sm font-medium">
                      Talk more
                    </button>
                  </div>

                  <details className="mt-3 rounded-xl border border-line p-3 text-sm">
                    <summary className="cursor-pointer font-medium">Post to GitHub</summary>
                    <p className="mt-2 text-xs text-muted">
                      Paste a fine-grained token with pull-request write access. It stays in this tab’s memory and is sent only to api.github.com.
                    </p>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="github_pat_…"
                      autoComplete="off"
                      className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-xs outline-none focus:border-accent"
                    />
                    <button
                      onClick={post}
                      disabled={!token || posting === "busy" || posting === "done"}
                      className="mt-2 w-full rounded-lg bg-accent py-2 text-sm font-semibold text-accent-ink disabled:opacity-40"
                    >
                      {posting === "busy" ? "Posting…" : posting === "done" ? "Posted ✓" : "Post review"}
                    </button>
                    {posting !== "idle" && posting !== "busy" && posting !== "done" && <p className="mt-2 text-xs text-accent">{posting}</p>}
                  </details>
                </div>
              )}
            </div>
          </aside>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-muted">
        Every comment is checked against the real diff before you see it. Nothing is stored on the server. No sign-in.
      </footer>
    </div>
  );
}
