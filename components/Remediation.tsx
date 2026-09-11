"use client";

import { Button } from "./Terminal";
import { LessonPoints } from "./LessonPoints";
import type { Remediation as Plan } from "@/lib/learning/remediate";
import type { Chapter } from "@/lib/content/schema";

/** Shown after a failed attempt: only the material for what actually fell short (D10). */
export function Remediation({
  chapter,
  plan,
  onRetry,
}: {
  chapter: Chapter;
  plan: Plan;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 border border-rule rounded-md overflow-hidden">
      <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted bg-raised border-b border-rule">
        Before you try again
      </div>

      <div className="p-4 space-y-5">
        <div>
          <p className="text-sm text-muted">
            Only the parts you missed — the rest of the chapter you already have.
          </p>
          <ul className="mt-2 space-y-1">
            {plan.objectives.map((id) => (
              <li key={id} className="flex gap-2.5 text-sm">
                <span className="text-ask" aria-hidden>·</span>
                {chapter.objectives.find((o) => o.id === id)?.statement}
              </li>
            ))}
          </ul>
        </div>

        {plan.lessons.map((lesson) => (
          <div key={lesson.id}>
            <h4 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
              {lesson.title}
            </h4>
            <LessonPoints points={lesson.points} className="mt-2" />
          </div>
        ))}

        <Button onClick={onRetry}>Try again with new questions</Button>
      </div>
    </div>
  );
}
