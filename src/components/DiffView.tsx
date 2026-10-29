"use client";

import { useState } from "react";
import type { DiffFile, DiffLine } from "@/lib/diff";
import type { ReviewComment } from "@/lib/review";

type Props = {
  files: DiffFile[];
  comments: ReviewComment[];
  rejected: Set<string>;
  edits: Record<string, string>;
  activeId: string | null;
  onActivate: (id: string) => void;
  onEdit: (id: string, body: string) => void;
  onToggleReject: (id: string) => void;
};

const mark = { add: "+", del: "-", ctx: " " } as const;
const rowBg = { add: "bg-[var(--add-bg)]", del: "bg-[var(--del-bg)]", ctx: "" } as const;
const markFg = { add: "text-[var(--add-fg)]", del: "text-[var(--del-fg)]", ctx: "text-muted" } as const;

function commentsFor(l: DiffLine, file: string, comments: ReviewComment[]) {
  return comments.filter(
    (c) => c.file === file && ((c.side === "RIGHT" && l.newNo === c.line) || (c.side === "LEFT" && l.oldNo === c.line)),
  );
}

function CommentCard({
  c,
  body,
  rejected,
  active,
  onActivate,
  onEdit,
  onToggleReject,
}: {
  c: ReviewComment;
  body: string;
  rejected: boolean;
  active: boolean;
  onActivate: () => void;
  onEdit: (b: string) => void;
  onToggleReject: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const color = `var(--sev-${c.severity})`;
  return (
    <div
      id={`cm-${c.id}`}
      className={`rise mx-1.5 my-2 scroll-mt-24 rounded-lg sm:mx-3 border bg-card font-sans text-[13.5px] leading-relaxed shadow-sm transition ${active ? "ring-2 ring-accent" : ""} ${rejected ? "opacity-45" : ""}`}
      style={{ borderColor: color, borderLeftWidth: 4 }}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 pt-2 text-xs">
        <span className="rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide text-white" style={{ background: color }}>
          {c.severity}
        </span>
        <button onClick={onActivate} className="text-muted underline decoration-dotted underline-offset-2 hover:text-ink" title="Highlight what you said">
          “{c.sourceQuote.length > 70 ? c.sourceQuote.slice(0, 70) + "…" : c.sourceQuote}”
        </button>
        <span className="ml-auto flex gap-2 text-muted">
          <button onClick={() => setEditing((e) => !e)} className="hover:text-ink">{editing ? "done" : "edit"}</button>
          <button onClick={onToggleReject} className="hover:text-ink">{rejected ? "restore" : "dismiss"}</button>
        </span>
      </div>
      <div className="px-3 pb-2.5 pt-1">
        {editing ? (
          <textarea
            value={body}
            onChange={(e) => onEdit(e.target.value)}
            rows={3}
            className="w-full rounded border border-line bg-paper p-2 text-[13.5px] outline-none focus:border-accent"
          />
        ) : (
          <p className={rejected ? "line-through" : ""}>{body}</p>
        )}
        {c.suggestedChange && (
          <pre className="mt-2 overflow-x-auto rounded bg-[var(--add-bg)] p-2 font-mono text-xs text-[var(--add-fg)]">{c.suggestedChange}</pre>
        )}
      </div>
    </div>
  );
}

export function DiffView({ files, comments, rejected, edits, activeId, onActivate, onEdit, onToggleReject }: Props) {
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4">
      {files.map((f, idx) => {
        const count = comments.filter((c) => c.file === f.path).length;
        const isClosed = closed[f.path] ?? (idx > 5 && count === 0);
        return (
          <section key={f.path} className="overflow-hidden rounded-xl border border-line bg-card">
            <button
              onClick={() => setClosed((s) => ({ ...s, [f.path]: !isClosed }))}
              className="flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left"
            >
              <span className="text-muted">{isClosed ? "▸" : "▾"}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-medium">{f.path}</span>
              {count > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">{count}</span>
              )}
              <span className="font-mono text-xs text-[var(--add-fg)]">+{f.additions}</span>
              <span className="font-mono text-xs text-[var(--del-fg)]">−{f.deletions}</span>
            </button>
            {!isClosed && f.hunks.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted">
                {f.binary ? "Binary file, nothing to review as text." : "No line changes to show (rename or mode change)."}
              </p>
            )}
            {!isClosed &&
              f.hunks.map((h, hi) => (
                <div key={hi}>
                  <div className="bg-paper px-3 py-1 font-mono text-[11px] text-muted">{h.header}</div>
                  {h.lines.map((l, li) => {
                    const here = commentsFor(l, f.path, comments);
                    return (
                      <div key={li}>
                        <div className={`grid grid-cols-[1.75rem_1.75rem_1rem_1fr] font-mono text-[11.5px] leading-[1.55] sm:grid-cols-[2.75rem_2.75rem_1.25rem_1fr] sm:text-[12.5px] ${rowBg[l.kind]}`}>
                          <span className="select-none pr-1 text-right text-muted/70 sm:pr-2">{l.oldNo ?? ""}</span>
                          <span className="select-none pr-1 text-right text-muted/70 sm:pr-2">{l.newNo ?? ""}</span>
                          <span className={`select-none text-center ${markFg[l.kind]}`}>{mark[l.kind]}</span>
                          <span className="whitespace-pre-wrap break-words pr-3">{l.text}</span>
                        </div>
                        {here.map((c) => (
                          <CommentCard
                            key={c.id}
                            c={c}
                            body={edits[c.id] ?? c.body}
                            rejected={rejected.has(c.id)}
                            active={activeId === c.id}
                            onActivate={() => onActivate(c.id)}
                            onEdit={(b) => onEdit(c.id, b)}
                            onToggleReject={() => onToggleReject(c.id)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}
