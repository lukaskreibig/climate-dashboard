"use client";

import { useEffect } from "react";

/** Route-level backstop: if anything outside a scene throws, the reader gets a
 *  readable page with a way back instead of a blank screen. */
export default function StoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Story route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#020617] px-6 text-center text-snow-50">
      <p className="text-xs uppercase tracking-[0.35em] text-sky-300/70">Schmelzpunkt</p>
      <h1 className="max-w-xl text-2xl font-semibold md:text-3xl">
        Die Geschichte konnte gerade nicht geladen werden.
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-400">
        Something interrupted the story. Reloading usually fixes it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full border border-white/25 px-6 py-2 text-sm transition-colors hover:border-white/60 hover:bg-white/10"
      >
        Neu laden · Reload
      </button>
    </main>
  );
}
