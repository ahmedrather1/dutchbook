"use client";

import Link from "next/link";
import { CHAPTERS, PLANNED_TITLES } from "@/lib/content/registry";

/** What to do once the lessons run out. Without this the chapter is a dead end. */
export function ChapterEnd({ number }: { number: number }) {
  const nextNumber = number + 1;
  const nextTitle = PLANNED_TITLES[nextNumber - 1];
  const next = CHAPTERS.find((c) => c.number === nextNumber);

  return (
    <div className="mt-10 border border-accent/40 rounded-md overflow-hidden">
      <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-accent bg-raised border-b border-rule">
        End of chapter {number}
      </div>
      <div className="p-4 space-y-4">
        {next ? (
          <>
            <p className="text-[15px]">
              Next up: <strong>{next.title}</strong> — {next.teaches}
            </p>
            <Link
              href={`/play/${next.slug}`}
              className="inline-block font-mono text-xs px-3 py-2 border border-accent rounded bg-raised text-accent hover:bg-accent hover:text-paper focus-visible:outline-2 focus-visible:outline-accent"
            >
              Start chapter {nextNumber} →
            </Link>
          </>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm">
              <li className="flex gap-2.5">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                You have finished every lesson in this chapter.
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                {nextTitle ? (
                  <>
                    Chapter {nextNumber}, <strong>{nextTitle}</strong>, is not built yet.
                  </>
                ) : (
                  <>This is the last chapter in the curriculum.</>
                )}
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent" aria-hidden>
                  ·
                </span>
                Drills and the chapter test are not built yet either, so nothing is scored so far.
              </li>
            </ul>
            <Link
              href="/"
              className="inline-block font-mono text-xs px-3 py-2 border border-rule rounded bg-raised text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              ← Back to all chapters
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
