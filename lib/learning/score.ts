import type { Chapter } from "@/lib/content/schema";
import type { Attempt, ChapterProgress, Progress } from "@/lib/progress/store";

export interface DrillResult {
  drillId: string;
  objectives: string[];
  correct: boolean;
  /** Taking a hint still teaches, but it does not prove mastery. */
  hintUsed?: boolean;
}

export interface ScenarioResult {
  scenarioId: string;
  objectives: string[];
  /** One entry per success goal. Judged on the goal, never on profit (F-3). */
  goalsMet: boolean[];
}

export interface Scored {
  /** 0..1 across the chapter's objectives. */
  score: number;
  perObjective: Record<string, number>;
  missed: string[];
  passed: boolean;
}

const HINT_CREDIT = 0.5;
const DEFAULT_OBJECTIVE_FLOOR = 0.5;

/**
 * Mastery per objective is the share of its assessments passed; the chapter score is the
 * mean across objectives. Passing needs the overall threshold *and* every objective above
 * the floor, so a strong average cannot carry an objective the next chapter depends on.
 */
export function scoreAttempt(
  chapter: Chapter,
  drills: readonly DrillResult[],
  scenarios: readonly ScenarioResult[] = [],
): Scored {
  const earned = new Map<string, number>();
  const possible = new Map<string, number>();

  const add = (objectiveId: string, credit: number) => {
    earned.set(objectiveId, (earned.get(objectiveId) ?? 0) + credit);
    possible.set(objectiveId, (possible.get(objectiveId) ?? 0) + 1);
  };

  for (const drill of drills) {
    const credit = drill.correct ? (drill.hintUsed ? HINT_CREDIT : 1) : 0;
    for (const id of drill.objectives) add(id, credit);
  }

  for (const scenario of scenarios) {
    if (scenario.goalsMet.length === 0) continue;
    const share = scenario.goalsMet.filter(Boolean).length / scenario.goalsMet.length;
    for (const id of scenario.objectives) add(id, share);
  }

  const perObjective: Record<string, number> = {};
  for (const objective of chapter.objectives) {
    const total = possible.get(objective.id) ?? 0;
    perObjective[objective.id] = total === 0 ? 0 : (earned.get(objective.id) ?? 0) / total;
  }

  const values = chapter.objectives.map((o) => perObjective[o.id]!);
  const score = values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
  const missed = chapter.objectives
    .filter((o) => perObjective[o.id]! < chapter.test.passThreshold)
    .map((o) => o.id);

  // Both bars must clear: a good average cannot hide a blank objective.
  const floor = chapter.test.objectiveFloor ?? DEFAULT_OBJECTIVE_FLOOR;
  const passed =
    score >= chapter.test.passThreshold && values.every((value) => value >= floor);

  return { score, perObjective, missed, passed };
}

/** Folds an attempt into saved progress. A replay never lowers a recorded best (D12). */
export function recordAttempt(progress: Progress, chapter: Chapter, scored: Scored): Progress {
  const existing: ChapterProgress = progress.chapters[chapter.slug] ?? {
    bestScore: 0,
    passed: false,
    attempts: [],
    mastery: {},
  };

  const attempt: Attempt = { at: Date.now(), score: scored.score, missed: scored.missed };
  const mastery = { ...existing.mastery };
  for (const [id, value] of Object.entries(scored.perObjective)) {
    mastery[id] = Math.max(mastery[id] ?? 0, value);
  }

  return {
    ...progress,
    chapters: {
      ...progress.chapters,
      [chapter.slug]: {
        bestScore: Math.max(existing.bestScore, scored.score),
        passed: existing.passed || scored.passed,
        attempts: [...existing.attempts, attempt].slice(-20),
        mastery,
      },
    },
  };
}
