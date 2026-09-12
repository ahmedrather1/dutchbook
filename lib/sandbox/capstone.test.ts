import { describe, it, expect } from "vitest";
import { scoreStrategy } from "./score";
import { referenceStrategy } from "./reference";
import { CAPSTONE_SUITE } from "@/lib/content/capstoneScenarios";

/**
 * The capstone must be winnable by a strategy a player could reasonably arrive at from
 * the preceding chapters. If this fails, the suite is broken, not the player.
 */
describe("the capstone suite is winnable", () => {
  const score = scoreStrategy(CAPSTONE_SUITE, referenceStrategy);

  it("a reasoned strategy passes it", () => {
    expect(score.notes).toEqual([]);
    expect(score.passed).toBe(true);
  });

  it("makes money overall", () => {
    expect(score.totalPnl).toBeGreaterThan(0);
  });

  it("closes every position it opens", () => {
    expect(score.strandedRuns).toBe(0);
  });

  it("actually trades rather than sitting out", () => {
    expect(score.totalTrades).toBeGreaterThan(10);
  });

  it("does not lose money on the market it has never seen", () => {
    // Sitting out a market that offers nothing is correct behaviour, not a failure —
    // so the bar is "does not lose", not "profits".
    const heldOut = score.runs.find((r) => r.scenarioId === "capstone-held-out")!;
    expect(heldOut.netPnl).toBeGreaterThanOrEqual(0);
  });

  it("profits on more than one market, so it is not a single lucky run", () => {
    expect(score.profitableRuns).toBeGreaterThanOrEqual(2);
  });
});
