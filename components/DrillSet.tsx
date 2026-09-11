"use client";

import { useMemo, useState } from "react";
import { DrillCard } from "./DrillCard";
import { Button } from "./Terminal";
import { instantiate, type Chapter, type Drill, type DrillTemplate } from "@/lib/content/schema";
import { makeRng } from "@/lib/engine/rng";
import { scoreAttempt, type DrillResult, type Scored } from "@/lib/learning/score";

export interface DrillSetProps {
  chapter: Chapter;
  drills: (Drill | DrillTemplate)[];
  /** Changing this regenerates every template drill, so a retry is genuinely fresh (D10). */
  seed: number;
  onFinished: (scored: Scored, results: DrillResult[]) => void;
  onRetry?: () => void;
}

export function DrillSet({ chapter, drills, seed, onFinished, onRetry }: DrillSetProps) {
  const instances = useMemo(
    () => drills.map((d, i) => instantiate(d, makeRng(seed * 1000 + i))),
    [drills, seed],
  );
  const [results, setResults] = useState<DrillResult[]>([]);
  const [scored, setScored] = useState<Scored | null>(null);

  const answered = results.length;
  const done = answered === instances.length;

  const answer = (drill: Drill, correct: boolean) => {
    setResults((prev) => [
      ...prev,
      { drillId: drill.id, objectives: drill.objectives, correct },
    ]);
  };

  const finish = () => {
    const result = scoreAttempt(chapter, results);
    setScored(result);
    onFinished(result, results);
  };

  if (scored) {
    return (
      <div className="border border-rule rounded-md bg-surface p-5">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">Result</h3>
        <p className="mt-2 text-2xl font-bold tabular-nums">
          {Math.round(scored.score * 100)}%
          <span className={`ml-3 text-sm font-mono ${scored.passed ? "text-bid" : "text-ask"}`}>
            {scored.passed ? "✓ passed" : "✗ not passed"}
          </span>
        </p>

        {scored.missed.length > 0 && (
          <>
            <p className="mt-4 text-sm text-muted">Worth another look:</p>
            <ul className="mt-2 space-y-1.5">
              {scored.missed.map((id) => (
                <li key={id} className="flex gap-2.5 text-sm">
                  <span className="text-ask" aria-hidden>·</span>
                  {chapter.objectives.find((o) => o.id === id)?.statement}
                </li>
              ))}
            </ul>
          </>
        )}

        {!scored.passed && onRetry && (
          <div className="mt-5">
            <Button onClick={onRetry}>Try again with new questions</Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-rule rounded overflow-hidden">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${(answered / instances.length) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted tabular-nums">
          {answered} / {instances.length}
        </span>
      </div>

      {instances.slice(0, answered + 1).map((drill, i) => (
        <DrillCard
          key={drill.id}
          drill={drill}
          index={i}
          total={instances.length}
          onAnswered={(correct) => answer(drill, correct)}
        />
      ))}

      {done && (
        <Button onClick={finish}>See your result</Button>
      )}
    </div>
  );
}
