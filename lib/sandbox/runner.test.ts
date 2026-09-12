import { describe, it, expect } from "vitest";
import { runStrategy } from "./runner";
import { scoreStrategy, CAPSTONE_RULES } from "./score";
import type { Strategy } from "./api";
import { calmMarket, newsShock } from "@/lib/engine/scenarios.fixture";

const doNothing: Strategy = () => ({ type: "hold" });

describe("runStrategy", () => {
  it("is deterministic for the same scenario and strategy (D18)", () => {
    const a = runStrategy(calmMarket, doNothing);
    const b = runStrategy(calmMarket, doNothing);
    expect(a).toEqual(b);
  });

  it("leaves a do-nothing strategy flat and even", () => {
    const out = runStrategy(calmMarket, doNothing);
    expect(out.finalPosition).toBe(0);
    expect(out.trades).toBe(0);
    expect(out.netPnl).toBe(0);
  });

  it("executes buys and records the position", () => {
    const buyOnce: Strategy = (ctx) => (ctx.tick === 5 ? { type: "buy", qty: 10 } : undefined);
    const out = runStrategy(calmMarket, buyOnce);
    expect(out.finalPosition).toBe(10);
    expect(out.trades).toBe(1);
    expect(out.strandedPosition).toBe(10);
  });

  it("gives the strategy a usable view of the book", () => {
    let seen: number | undefined;
    runStrategy(calmMarket, (ctx) => {
      if (ctx.tick === 3) seen = ctx.market.bestAsk;
    });
    expect(seen).toBeGreaterThan(0);
  });

  it("keeps memory between ticks", () => {
    let final = 0;
    runStrategy(calmMarket, (ctx) => {
      ctx.memory.count = ((ctx.memory.count as number) ?? 0) + 1;
      final = ctx.memory.count as number;
    });
    expect(final).toBe(calmMarket.durationTicks);
  });

  it("captures a throw instead of aborting the run", () => {
    const out = runStrategy(calmMarket, (ctx) => {
      if (ctx.tick === 4) throw new Error("boom");
      return { type: "hold" };
    });
    expect(out.error).toBe("boom");
    expect(out.scenarioId).toBe(calmMarket.id);
  });

  it("stops calling a strategy once it has thrown", () => {
    let calls = 0;
    runStrategy(calmMarket, () => {
      calls += 1;
      throw new Error("always");
    });
    expect(calls).toBe(1);
  });

  it("ignores nonsense actions rather than trusting them", () => {
    const out = runStrategy(calmMarket, () => ({ type: "buy", qty: -5 }) as never);
    expect(out.trades).toBe(0);
    expect(out.finalPosition).toBe(0);
  });

  it("caps how many actions one tick may take", () => {
    const spam: Strategy = () => Array.from({ length: 50 }, () => ({ type: "buy", qty: 1 }) as const);
    const out = runStrategy(calmMarket, spam);
    expect(out.trades).toBeLessThanOrEqual(calmMarket.durationTicks * 4);
  });

  it("caps how much a strategy can log", () => {
    const out = runStrategy(calmMarket, (ctx) => {
      for (let i = 0; i < 100; i++) ctx.log("spam", i);
    });
    expect(out.logs.length).toBeLessThanOrEqual(200);
  });

  it("settles the position when the scenario resolves", () => {
    const out = runStrategy(newsShock, (ctx) => (ctx.tick === 3 ? { type: "buy", qty: 10 } : undefined));
    expect(out.finalPosition).toBe(0);
    expect(out.realised).not.toBe(0);
  });
});

describe("scoreStrategy", () => {
  const suite = [calmMarket, newsShock];

  it("fails a strategy that never trades", () => {
    const score = scoreStrategy(suite, doNothing);
    expect(score.passed).toBe(false);
    expect(score.notes).toContain("Your strategy never traded.");
  });

  it("fails a profitable strategy that leaves a position open (J-4)", () => {
    const buyAndHold: Strategy = (ctx) => (ctx.tick === 2 ? { type: "buy", qty: 5 } : undefined);
    const score = scoreStrategy([calmMarket], buyAndHold);
    expect(score.strandedRuns).toBe(1);
    expect(score.passed).toBe(false);
    expect(score.notes.some((n) => n.includes("never closed"))).toBe(true);
  });

  it("reports errors per scenario", () => {
    const score = scoreStrategy(suite, () => {
      throw new Error("nope");
    });
    expect(score.errors).toHaveLength(2);
    expect(score.passed).toBe(false);
  });

  it("reports a breakdown, not just a verdict", () => {
    const score = scoreStrategy(suite, doNothing);
    expect(score.runs).toHaveLength(2);
    expect(score).toHaveProperty("worstDrawdown");
    expect(score).toHaveProperty("totalTrades");
  });

  it("is deterministic", () => {
    expect(scoreStrategy(suite, doNothing)).toEqual(scoreStrategy(suite, doNothing));
  });

  it("uses the rules it is given", () => {
    const buyAndHold: Strategy = (ctx) => (ctx.tick === 2 ? { type: "buy", qty: 5 } : undefined);
    const lenient = scoreStrategy([calmMarket], buyAndHold, {
      ...CAPSTONE_RULES,
      allowStranded: true,
      minTotalPnl: -1e9,
      maxDrawdown: 1e9,
    });
    expect(lenient.notes.some((n) => n.includes("never closed"))).toBe(false);
  });
});
