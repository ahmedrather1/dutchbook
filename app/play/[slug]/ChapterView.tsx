"use client";

import { useState } from "react";
import { OrderBook } from "@/components/OrderBook";
import { OrderTicket } from "@/components/OrderTicket";
import { Tape } from "@/components/Tape";
import { Button, Stat } from "@/components/Terminal";
import { useSimulation } from "@/components/useSimulation";
import { formatCents } from "@/lib/engine/money";
import type { Cents } from "@/lib/engine/money";
import { getChapter } from "@/lib/content/registry";

export function ChapterView({ slug }: { slug: string }) {
  const [lessonIndex, setLessonIndex] = useState(0);
  const chapter = getChapter(slug)!;
  const step = chapter.scenarios[0]!;
  const sim = useSimulation(step.scenario);
  const lesson = chapter.lessons[lessonIndex]!;
  const isLast = lessonIndex === chapter.lessons.length - 1;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="border-b border-rule pb-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          Chapter {chapter.number}
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{chapter.title}</h1>
        <p className="text-muted mt-1">{chapter.teaches}</p>
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

          <ul className="mt-4 space-y-1.5 border border-rule rounded-md bg-surface p-4">
            {lesson.points.map((point, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
                <span className="text-accent select-none" aria-hidden>
                  ·
                </span>
                <span dangerouslySetInnerHTML={{ __html: bold(point) }} />
              </li>
            ))}
          </ul>

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
        </section>

        <aside>
          <OrderBook bids={sim.state.bids} asks={sim.state.asks} teaching />

          <div className="grid grid-cols-4 border border-t-0 border-rule text-sm">
            <Stat label="Tick" value={String(sim.state.tick)} hint="Time in the simulation." />
            <Stat label="Left" value={String(sim.state.remaining)} hint="Ticks until the market closes." />
            <Stat label="Position" value={String(sim.state.position)} hint="Contracts you hold." />
            <Stat
              label="Cash"
              value={formatCents(sim.state.cash as Cents)}
              hint="What you have left to spend."
            />
          </div>

          <div className="flex gap-2 mt-3 items-center">
            {sim.running ? (
              <Button onClick={sim.pause}>Pause</Button>
            ) : (
              <Button onClick={sim.start}>{sim.state.tick === 0 ? "Start market" : "Resume"}</Button>
            )}
            <span className="font-mono text-[11px] text-muted">
              {sim.running ? "● live" : sim.state.remaining === 0 ? "closed" : "paused"}
            </span>
          </div>

          <OrderTicket estimate={sim.estimate} onSubmit={sim.trade} />
          <Tape trades={sim.state.trades} />
        </aside>
      </div>
    </main>
  );
}

/** Lesson points use **bold** for the term being defined. */
function bold(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
