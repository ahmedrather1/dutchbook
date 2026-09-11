import { describe, it, expect } from "vitest";
import { selectRemediation } from "./remediate";
import { chapter1 } from "@/lib/content/ch01";

describe("selectRemediation", () => {
  it("returns nothing when nothing was missed", () => {
    expect(selectRemediation(chapter1, [])).toEqual({ objectives: [], lessons: [], drills: [] });
  });

  it("returns only the material for the missed objective, not the whole chapter (D10)", () => {
    const result = selectRemediation(chapter1, ["read-spread"]);

    expect(result.lessons.length).toBeGreaterThan(0);
    expect(result.lessons.length).toBeLessThan(chapter1.lessons.length);
    for (const lesson of result.lessons) {
      expect(lesson.objectives).toContain("read-spread");
    }
    for (const drill of result.drills) {
      expect(drill.objectives).toContain("read-spread");
    }
  });

  it("covers every missed objective when several fall short", () => {
    const missed = ["read-spread", "price-is-probability"];
    const result = selectRemediation(chapter1, missed);
    const covered = new Set(result.lessons.flatMap((l) => l.objectives));
    for (const id of missed) expect(covered).toContain(id);
  });

  it("prefers drills the player has not already seen", () => {
    const all = chapter1.drills.filter((d) => d.objectives.includes("read-bid-ask"));
    expect(all.length).toBeGreaterThan(1);

    const result = selectRemediation(chapter1, ["read-bid-ask"], [all[0]!.id]);
    expect(result.drills.map((d) => d.id)).not.toContain(all[0]!.id);
  });

  it("falls back to seen drills rather than returning none", () => {
    const all = chapter1.drills.filter((d) => d.objectives.includes("read-bid-ask"));
    const result = selectRemediation(chapter1, ["read-bid-ask"], all.map((d) => d.id));
    expect(result.drills.length).toBeGreaterThan(0);
  });
});
