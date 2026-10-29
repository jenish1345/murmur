const HEIGHTS = [10, 22, 14, 34, 20, 44, 26, 38, 16, 30, 12, 24, 36, 18, 28, 10];

/** Voice bars on the left resolve into diff lines on the right: speech becoming line-anchored review. */
export function Motif({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 120" className={className} role="img" aria-label="A voice waveform turning into lines of a code diff">
      <g transform="translate(0,60)">
        {HEIGHTS.map((h, i) => (
          <rect
            key={i}
            className="wave-bar"
            style={{ animationDelay: `${(i % 8) * 0.11}s` }}
            x={i * 12}
            y={-h}
            width="6"
            height={h * 2}
            rx="3"
            fill="var(--accent)"
          />
        ))}
      </g>
      <path d="M205 60h30m-8-7 8 7-8 7" stroke="var(--muted)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g fontFamily="var(--font-geist-mono)" fontSize="9">
        {[
          { y: 26, w: 120, c: "var(--line)", m: " " },
          { y: 42, w: 92, c: "var(--del-bg)", m: "-" },
          { y: 58, w: 140, c: "var(--add-bg)", m: "+" },
          { y: 74, w: 104, c: "var(--add-bg)", m: "+" },
          { y: 90, w: 128, c: "var(--line)", m: " " },
        ].map((r) => (
          <g key={r.y}>
            <rect x="250" y={r.y - 8} width="160" height="14" rx="3" fill="var(--card)" stroke="var(--line)" />
            <rect x="254" y={r.y - 5} width={r.w} height="8" rx="2" fill={r.c} />
          </g>
        ))}
        <circle cx="402" cy="66" r="7" fill="var(--accent)" />
        <text x="402" y="69" textAnchor="middle" fill="var(--accent-ink)" fontWeight="700">!</text>
      </g>
    </svg>
  );
}
