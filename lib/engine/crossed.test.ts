import { describe, it, expect } from "vitest";
import { runStrategy } from "@/lib/sandbox/runner";
import { CAPSTONE_SUITE } from "@/lib/content/capstoneScenarios";
import { CHAPTERS } from "@/lib/content/registry";

/**
 * A crossed book is a free arbitrage nobody took, which cannot persist on a real venue.
 * If one appears, the simulation is lying to the player.
 */
describe("no scenario ever leaves the book crossed", () => {
  const scenarios = [
    ...CAPSTONE_SUITE,
    ...CHAPTERS.flatMap((c) => c.scenarios.map((s) => s.scenario)),
  ];

  it.each(scenarios.map((s) => [s.id, s] as const))("%s stays uncrossed", (_id, scenario) => {
    let worst = Infinity;
    runStrategy(scenario, (ctx) => {
      if (ctx.market.spread !== undefined) worst = Math.min(worst, ctx.market.spread);
    });
    expect(worst).toBeGreaterThanOrEqual(0);
  });
});
