"use client";

import { useState } from "react";
import { OrderBook } from "@/components/OrderBook";
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="border-b border-rule pb-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          Chapter {chapter.number}
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{chapter.title}</h1>
        <p className="text-muted mt-1">{chapter.teaches}</p>
      </header>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8 mt-8 items-start">
        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
            {lesson.title}
          </h2>
          <div className="mt-3 space-y-4 max-w-[65ch] leading-relaxed">
            {lesson.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={() => setLessonIndex((i) => i - 1)} disabled={lessonIndex === 0}>
              ← Previous
            </Button>
            <Button
              onClick={() => setLessonIndex((i) => i + 1)}
              disabled={lessonIndex === chapter.lessons.length - 1}
            >
              Next →
            </Button>
            <span className="font-mono text-xs text-muted self-center ml-2 tabular-nums">
              {lessonIndex + 1} / {chapter.lessons.length}
            </span>
          </div>

          <p className="mt-8 text-sm text-muted max-w-[60ch] border-l-2 border-rule pl-4">
            {step.brief}
          </p>
        </section>

        <aside>
          <OrderBook bids={sim.state.bids} asks={sim.state.asks} teaching />

          <div className="grid grid-cols-3 border border-t-0 border-rule text-sm">
            <Stat label="Tick" value={String(sim.state.tick)} />
            <Stat label="Position" value={String(sim.state.position)} hint="Contracts you hold." />
            <Stat
              label="Cash"
              value={formatCents(sim.state.cash as Cents)}
              hint="What you have left to spend."
            />
          </div>

          <div className="flex gap-2 mt-3">
            {sim.running ? (
              <Button onClick={sim.pause}>Pause</Button>
            ) : (
              <Button onClick={sim.start}>Start market</Button>
            )}
            <Button onClick={() => sim.buy(10)}>Buy 10</Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
