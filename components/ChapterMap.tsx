"use client";

import Link from "next/link";
import { CHAPTERS, PLANNED_TITLES } from "@/lib/content/registry";
import { chapterState, unlockRequirement } from "@/lib/learning/gate";
import { chapterProgress } from "@/lib/progress/store";
import { useProgress } from "./useProgress";

export function ChapterMap() {
  const { progress } = useProgress();

  return (
    <ol className="mt-12 border-t border-rule">
      {PLANNED_TITLES.map((title, i) => {
        const number = i + 1;
        const chapter = CHAPTERS.find((c) => c.number === number);
        const state = chapter ? chapterState(progress, CHAPTERS, chapter) : "unbuilt";
        const record = chapter ? chapterProgress(progress, chapter.slug) : undefined;

        return (
          <li key={title} className="border-b border-rule">
            {chapter && state !== "locked" ? (
              <Link
                href={`/play/${chapter.slug}`}
                className="flex items-baseline gap-4 py-3 group focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Number n={number} />
                <span className="font-medium group-hover:text-accent">{title}</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-accent tabular-nums">
                  {state === "passed"
                    ? `✓ passed · ${Math.round((record?.bestScore ?? 0) * 100)}%`
                    : record && record.attempts.length > 0
                      ? `${Math.round(record.bestScore * 100)}% · retry`
                      : "start"}
                </span>
              </Link>
            ) : (
              <div className="flex items-baseline gap-4 py-3 text-muted">
                <Number n={number} />
                <span>
                  {title}
                  {chapter && state === "locked" && (
                    <span className="block text-xs mt-0.5">
                      {unlockRequirement(CHAPTERS, chapter)}
                    </span>
                  )}
                </span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider">
                  {chapter ? "locked" : "not built"}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Number({ n }: { n: number }) {
  return (
    <span className="font-mono text-xs text-muted tabular-nums w-8">
      {String(n).padStart(2, "0")}
    </span>
  );
}
