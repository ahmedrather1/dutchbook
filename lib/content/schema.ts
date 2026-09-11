import type { Scenario } from "@/lib/engine/sim";
import type { Rng } from "@/lib/engine/rng";

export const CONTENT_SCHEMA_VERSION = 1;

/** A thing the player can do after the chapter. Everything is assessed against these. */
export interface Objective {
  id: string;
  /** Written as a capability: "Read bid, ask, and spread from a book." */
  statement: string;
}

export interface Lesson {
  id: string;
  title: string;
  /** Short paragraphs. Prose exists to set up interaction, not to be read at length (D1). */
  body: string[];
  /** Terms this lesson introduces; the content lint checks nothing is used before this. */
  defines?: string[];
  objectives: string[];
}

interface DrillBase {
  id: string;
  /** Which objectives this drill assesses. Required, because remediation depends on it (D-1). */
  objectives: string[];
  prompt: string;
  /** Shown after answering, whether right or wrong. Explains *why* (E-8). */
  explanation: string;
}

export interface ChoiceDrill extends DrillBase {
  kind: "choice";
  options: string[];
  answerIndex: number;
}

export interface NumericDrill extends DrillBase {
  kind: "numeric";
  answer: number;
  /** Accepted absolute error. Zero means exact. */
  tolerance: number;
  unit?: string;
}

export interface BookReadDrill extends DrillBase {
  kind: "book-read";
  book: { side: "buy" | "sell"; price: number; qty: number }[];
  /** What to read off the book. */
  ask: "best-bid" | "best-ask" | "spread" | "depth-at-best-ask" | "cost-to-buy";
  qty?: number;
  answer: number;
}

export type Drill = ChoiceDrill | NumericDrill | BookReadDrill;

/**
 * Generates a fresh instance of a drill from a seed, so a retry is never the same
 * questions as the failed attempt (D10). Answers are computed, never hard-coded.
 */
export type DrillTemplate = { id: string; objectives: string[]; generate: (rng: Rng) => Drill };

export interface ScenarioStep {
  id: string;
  scenario: Scenario;
  brief: string;
  objectives: string[];
  /** Judged on objectives met, not on profit (F-3). */
  success: ScenarioGoal[];
}

export type ScenarioGoal =
  | { kind: "min-position"; qty: number; label: string }
  | { kind: "min-realised"; cents: number; label: string }
  | { kind: "max-average-cost"; ticks: number; label: string }
  | { kind: "no-unhedged-leg"; label: string }
  | { kind: "answer"; questionId: string; label: string };

export interface ChapterTest {
  /** Fraction of available points needed to pass. Per-chapter by design (D11). */
  passThreshold: number;
  drills: (Drill | DrillTemplate)[];
  scenarios?: ScenarioStep[];
}

export interface Chapter {
  number: number;
  slug: string;
  title: string;
  /** One line shown on the chapter map, including while locked (D12). */
  teaches: string;
  estimatedMinutes: number;
  objectives: Objective[];
  lessons: Lesson[];
  drills: (Drill | DrillTemplate)[];
  scenarios: ScenarioStep[];
  test: ChapterTest;
}

export function isTemplate(d: Drill | DrillTemplate): d is DrillTemplate {
  return "generate" in d;
}

export function instantiate(d: Drill | DrillTemplate, rng: Rng): Drill {
  return isTemplate(d) ? d.generate(rng) : d;
}

/** Every objective id referenced anywhere in the chapter. */
export function referencedObjectives(chapter: Chapter): Set<string> {
  const out = new Set<string>();
  const add = (ids: string[]) => ids.forEach((id) => out.add(id));
  chapter.lessons.forEach((l) => add(l.objectives));
  chapter.drills.forEach((d) => add(d.objectives));
  chapter.scenarios.forEach((s) => add(s.objectives));
  chapter.test.drills.forEach((d) => add(d.objectives));
  chapter.test.scenarios?.forEach((s) => add(s.objectives));
  return out;
}
