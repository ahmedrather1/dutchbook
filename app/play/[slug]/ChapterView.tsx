"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketPanel } from "@/components/MarketPanel";
import { ChapterEnd } from "@/components/ChapterEnd";
import { Button } from "@/components/Terminal";
import { DrillSet } from "@/components/DrillSet";
import { Remediation } from "@/components/Remediation";
import { LessonPoints } from "@/components/LessonPoints";
import { selectRemediation } from "@/lib/learning/remediate";
import { useProgress } from "@/components/useProgress";
import { getChapter } from "@/lib/content/registry";
import { chapterProgress } from "@/lib/progress/store";
import { recordAttempt, type Scored } from "@/lib/learning/score";

export function ChapterView({ slug }: { slug: string }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const [attemptSeed, setAttemptSeed] = useState(1);
  const [phase, setPhase] = useState<"lessons" | "drills">("lessons");
  const { progress, update } = useProgress();
  const chapter = getChapter(slug)!;
  const step = chapter.scenarios[0]!;
  const lesson = chapter.lessons[lessonIndex]!;
  const isLast = lessonIndex === chapter.lessons.length - 1;
  const record = chapterProgress(progress, chapter.slug);

  const [seenDrills, setSeenDrills] = useState<string[]>([]);

  const finishDrills = (scored: Scored, results: { drillId: string }[]) => {
    update(recordAttempt(progress, chapter, scored));
    setSeenDrills((prev) => [...prev, ...results.map((r) => r.drillId)]);
  };

  const retry = () => setAttemptSeed((s) => s + 1);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="border-b border-rule pb-4">
        <div className="flex items-baseline gap-3">
          <Link
            href="/"
            className="font-mono text-[11px] text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
          >
            ← All chapters
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
            Chapter {chapter.number}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{chapter.title}</h1>
        <p className="text-muted mt-1">{chapter.teaches}</p>
        {record.attempts.length > 0 && (
          <p className="font-mono text-xs text-muted mt-2 tabular-nums">
            best {Math.round(record.bestScore * 100)}%
            {record.passed && <span className="text-bid ml-2">✓ passed</span>}
          </p>
        )}
      </header>

      <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-8 items-start">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
              {lesson.title}
            </h2>
            <span className="font-mono text-xs text-muted tabular-nums">
              {lessonIndex + 1} / {chapter.lessons.length}
            </span>
          </div>

          <div className="mt-4 border border-rule rounded-md bg-surface p-4">
            <LessonPoints points={lesson.points} />
          </div>

          <details className="mt-3 group">
            <summary className="cursor-pointer font-mono text-xs text-muted hover:text-accent list-none focus-visible:outline-2 focus-visible:outline-accent">
              <span className="group-open:hidden">+ read the longer explanation</span>
              <span className="hidden group-open:inline">− hide</span>
            </summary>
            <div className="mt-3 space-y-4 max-w-[64ch] leading-relaxed">
              {lesson.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </details>

          <div className="flex gap-2 mt-6">
            <Button onClick={() => setLessonIndex((i) => i - 1)} disabled={lessonIndex === 0}>
              ← Previous
            </Button>
            <Button onClick={() => setLessonIndex((i) => i + 1)} disabled={isLast}>
              Next →
            </Button>
          </div>

          <div className="mt-10 border border-rule rounded-md overflow-hidden">
            <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted bg-raised border-b border-rule">
              Your task
            </div>
            <div className="p-4">
              <p className="text-[15px]">{step.brief}</p>
              <ul className="mt-4 space-y-1.5">
                {step.objectives.map((id) => {
                  const objective = chapter.objectives.find((o) => o.id === id);
                  return (
                    <li key={id} className="flex gap-2.5 text-sm text-muted">
                      <span className="font-mono text-accent" aria-hidden>
                        ☐
                      </span>
                      {objective?.statement}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {isLast && phase === "lessons" && (
            <div className="mt-10 border border-accent/40 rounded-md overflow-hidden">
              <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-accent bg-raised border-b border-rule">
                Ready when you are
              </div>
              <div className="p-4">
                <p className="text-[15px]">
                  That is every lesson. The test is {chapter.test.drills.length} questions, and you
                  need {Math.round(chapter.test.passThreshold * 100)}% to pass.
                </p>
                <div className="mt-4">
                  <Button onClick={() => setPhase("drills")}>
                    {record.passed ? "Take it again" : "Take the chapter test"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {phase === "drills" && (
            <div className="mt-10">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent mb-3">
                Chapter {chapter.number} test
              </h2>
              <DrillSet
                key={attemptSeed}
                chapter={chapter}
                drills={chapter.test.drills}
                seed={attemptSeed}
                onFinished={finishDrills}
                afterResult={(scored) =>
                  scored.passed ? null : (
                    <Remediation
                      chapter={chapter}
                      plan={selectRemediation(chapter, scored.missed, seenDrills)}
                      onRetry={retry}
                    />
                  )
                }
              />
            </div>
          )}

          {record.passed && phase === "drills" && <ChapterEnd number={chapter.number} />}
        </section>

        <aside>
          <MarketPanel
            key={runId}
            scenario={step.scenario}
            onRestart={() => setRunId((n) => n + 1)}
          />
        </aside>
      </div>
    </main>
  );
}
