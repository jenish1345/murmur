import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Murmur: the 2-minute demo",
  description: "Review pull requests by talking. A two-minute film of Murmur, built for No Hands: The Wispr Challenge.",
};

export default function Demo() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-muted hover:text-ink">← Murmur</Link>
      <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        Say it. <span className="text-accent">Ship the review.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        A two-minute tour: the real app, the four things only Murmur does, and the details. Built for No Hands: The Wispr Challenge (Builders track).
      </p>
      <video
        className="mt-6 w-full rounded-2xl border border-line bg-black"
        controls
        playsInline
        preload="metadata"
        poster="/demo/poster.jpg"
      >
        <source src="/demo/murmur-demo.mp4" type="video/mp4" />
        <track kind="captions" src="/demo/captions.vtt" srcLang="en" label="English" default />
      </video>
      <p className="mt-3 text-sm text-muted">
        The app footage is a real recording of the live site. The narration is synthesized.{" "}
        <a className="underline" href="/demo/murmur-demo.mp4" download>Download the mp4</a>
        {" · "}
        <a className="underline" href="https://github.com/jenish1345/murmur" target="_blank" rel="noreferrer">Code on GitHub</a>
        {" · "}
        <Link className="underline" href="/">Try the app</Link>
      </p>
    </main>
  );
}
