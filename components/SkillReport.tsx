"use client";

import Link from "next/link";
import { CHAPTERS } from "@/lib/content/registry";
import { chapterProgress } from "@/lib/progress/store";
import { useProgress } from "./useProgress";

interface Row {
  chapterNumber: number;
  slug: string;
  objectiveId: string;
  statement: string;
  mastery: number | undefined;
}

/**
 * Mastery per objective, weakest first. Untouched material is shown as untouched, never
 * as 0% — a thing you have not tried is not a thing you failed (F-7).
 */
export function SkillReport() {
  const { progress } = useProgress();

  const rows: Row[] = CHAPTERS.flatMap((chapter) => {
    const record = chapterProgress(progress, chapter.slug);
    return chapter.objectives.map((objective) => ({
      chapterNumber: chapter.number,
      slug: chapter.slug,
      objectiveId: objective.id,
      statement: objective.statement,
      mastery: record.mastery[objective.id],
    }));
  });

  const attempted = rows.filter((r) => r.mastery !== undefined);
  const weakest = [...attempted].sort((a, b) => a.mastery! - b.mastery!).slice(0, 6);
  const untouched = rows.length - attempted.length;

  if (attempted.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">
        Nothing attempted yet. Take a chapter test and your weakest areas will show up here.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
          Worth another look
        </h3>
        <ul className="mt-3 space-y-2">
          {weakest.map((row) => (
            <li key={`${row.slug}-${row.objectiveId}`} className="flex items-baseline gap-3">
              <Bar value={row.mastery!} />
              <Link
                href={`/play/${row.slug}`}
                className="text-sm hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                {row.statement}
              </Link>
              <span className="ml-auto font-mono text-xs text-muted tabular-nums shrink-0">
                ch{row.chapterNumber} · {Math.round(row.mastery! * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="font-mono text-xs text-muted">
        {attempted.length} of {rows.length} objectives attempted
        {untouched > 0 && ` · ${untouched} not tried yet`}
      </p>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span
      className="inline-flex h-1.5 w-16 shrink-0 rounded overflow-hidden bg-rule"
      role="img"
      aria-label={`${pct} percent`}
    >
      <span
        className={pct >= 80 ? "bg-bid" : pct >= 50 ? "bg-accent" : "bg-ask"}
        style={{ width: `${Math.max(3, pct)}%` }}
      />
    </span>
  );
}
