import { describe, it, expect } from "vitest";
import { scoreAttempt, recordAttempt, type DrillResult, type ScenarioResult } from "./score";
import { chapterState, unlockRequirement } from "./gate";
import { chapter1 } from "@/lib/content/ch01";
import { emptyProgress } from "@/lib/progress/store";

const OBJECTIVES = chapter1.objectives.map((o) => o.id);
const allCorrect = (): DrillResult[] =>
  OBJECTIVES.map((id) => ({ drillId: `d-${id}`, objectives: [id], correct: true }));

describe("scoreAttempt", () => {
  it("gives full marks when everything is right", () => {
    const scored = scoreAttempt(chapter1, allCorrect());
    expect(scored.score).toBe(1);
    expect(scored.passed).toBe(true);
    expect(scored.missed).toEqual([]);
  });

  it("names exactly the objectives that fell short", () => {
    const drills = allCorrect();
    drills[0] = { ...drills[0]!, correct: false };
    const scored = scoreAttempt(chapter1, drills);
    expect(scored.missed).toEqual([OBJECTIVES[0]]);
    expect(scored.passed).toBe(false);
  });

  it("fails a blank objective even when the average clears the threshold", () => {
    // Four of five objectives perfect scores 0.8, which is exactly chapter 1's threshold.
    const drills = allCorrect();
    drills[0] = { ...drills[0]!, correct: false };
    const scored = scoreAttempt(chapter1, drills);
    expect(scored.score).toBeCloseTo(0.8);
    expect(scored.score).toBeGreaterThanOrEqual(chapter1.test.passThreshold);
    expect(scored.passed).toBe(false);
  });

  it("weights every objective equally, so one strong area cannot carry a blank one", () => {
    const drills: DrillResult[] = [
      ...Array.from({ length: 10 }, (_, i) => ({
        drillId: `many-${i}`,
        objectives: [OBJECTIVES[0]!],
        correct: true,
      })),
      { drillId: "one", objectives: [OBJECTIVES[1]!], correct: false },
    ];
    const scored = scoreAttempt(chapter1, drills);
    expect(scored.perObjective[OBJECTIVES[0]!]).toBe(1);
    expect(scored.perObjective[OBJECTIVES[1]!]).toBe(0);
    expect(scored.passed).toBe(false);
  });

  it("gives partial credit for a hinted answer", () => {
    const drills = allCorrect();
    drills[0] = { ...drills[0]!, hintUsed: true };
    expect(scoreAttempt(chapter1, drills).perObjective[OBJECTIVES[0]!]).toBe(0.5);
  });

  it("scores a scenario on goals met, not on profit", () => {
    const scenarios: ScenarioResult[] = [
      { scenarioId: "s", objectives: [OBJECTIVES[0]!], goalsMet: [true, false] },
    ];
    const scored = scoreAttempt(chapter1, [], scenarios);
    expect(scored.perObjective[OBJECTIVES[0]!]).toBe(0.5);
  });

  it("treats an unassessed objective as zero, never as a pass", () => {
    const scored = scoreAttempt(chapter1, [
      { drillId: "one", objectives: [OBJECTIVES[0]!], correct: true },
    ]);
    expect(scored.perObjective[OBJECTIVES[1]!]).toBe(0);
    expect(scored.passed).toBe(false);
  });
});

describe("recordAttempt", () => {
  it("keeps the best score and never un-passes a chapter (D12)", () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, chapter1, scoreAttempt(chapter1, allCorrect()));

    const weak = allCorrect().map((d) => ({ ...d, correct: false }));
    progress = recordAttempt(progress, chapter1, scoreAttempt(chapter1, weak));

    const record = progress.chapters[chapter1.slug]!;
    expect(record.bestScore).toBe(1);
    expect(record.passed).toBe(true);
    expect(record.attempts).toHaveLength(2);
  });

  it("keeps the highest mastery seen per objective", () => {
    let progress = emptyProgress();
    progress = recordAttempt(progress, chapter1, scoreAttempt(chapter1, allCorrect()));
    const weak = allCorrect().map((d) => ({ ...d, correct: false }));
    progress = recordAttempt(progress, chapter1, scoreAttempt(chapter1, weak));
    expect(progress.chapters[chapter1.slug]!.mastery[OBJECTIVES[0]!]).toBe(1);
  });
});

describe("chapterState", () => {
  it("leaves the first chapter available and reports it passed once it is", () => {
    const progress = emptyProgress();
    expect(chapterState(progress, [chapter1], chapter1)).toBe("available");

    const after = recordAttempt(progress, chapter1, scoreAttempt(chapter1, allCorrect()));
    expect(chapterState(after, [chapter1], chapter1)).toBe("passed");
  });

  it("locks a chapter until the one before it is passed", () => {
    const chapter2 = { ...chapter1, number: 2, slug: "ch2" };
    const chapters = [chapter1, chapter2];
    expect(chapterState(emptyProgress(), chapters, chapter2)).toBe("locked");

    const after = recordAttempt(emptyProgress(), chapter1, scoreAttempt(chapter1, allCorrect()));
    expect(chapterState(after, chapters, chapter2)).toBe("available");
  });

  it("says what unlocks a locked chapter", () => {
    const chapter2 = { ...chapter1, number: 2, slug: "ch2" };
    expect(unlockRequirement([chapter1, chapter2], chapter2)).toMatch(/Pass chapter 1/);
    expect(unlockRequirement([chapter1], chapter1)).toBeUndefined();
  });
});
