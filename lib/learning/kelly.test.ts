import { describe, it, expect } from "vitest";
import { kellyFraction, fractionalKelly, overbetPenalty } from "./kelly";

describe("kellyFraction", () => {
  it("is zero when there is no edge", () => {
    expect(kellyFraction(0.5, 0.5)).toBe(0);
    expect(kellyFraction(0.4, 0.5)).toBe(0);
  });

  it("computes edge divided by the odds received", () => {
    // Believe 70%, pay 50c: edge 0.2, risking 0.5 to win 0.5 => 0.4 of bankroll.
    expect(kellyFraction(0.7, 0.5)).toBeCloseTo(0.4, 6);
    // Believe 60%, pay 50c: edge 0.1 => 0.2.
    expect(kellyFraction(0.6, 0.5)).toBeCloseTo(0.2, 6);
  });

  it("bets everything only on a certainty", () => {
    expect(kellyFraction(1, 0.5)).toBeCloseTo(1, 6);
  });

  it("bets less as the price rises for the same belief", () => {
    expect(kellyFraction(0.9, 0.8)).toBeLessThan(kellyFraction(0.9, 0.5));
  });

  it("rejects impossible inputs", () => {
    expect(() => kellyFraction(0.5, 0)).toThrow(RangeError);
    expect(() => kellyFraction(0.5, 1)).toThrow(RangeError);
    expect(() => kellyFraction(1.5, 0.5)).toThrow(RangeError);
  });
});

describe("fractionalKelly", () => {
  it("is a scaled-down full Kelly", () => {
    expect(fractionalKelly(0.7, 0.5, 0.25)).toBeCloseTo(0.1, 6);
    expect(fractionalKelly(0.7, 0.5, 0.5)).toBeCloseTo(0.2, 6);
  });
});

describe("overbetPenalty", () => {
  it("is best at exactly Kelly", () => {
    expect(overbetPenalty(0.4, 0.4)).toBeCloseTo(1, 6);
  });

  it("is positive but smaller when underbetting", () => {
    const half = overbetPenalty(0.4, 0.2);
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
  });

  it("turns negative beyond twice Kelly — the ruin zone", () => {
    expect(overbetPenalty(0.4, 0.8)).toBeCloseTo(0, 6);
    expect(overbetPenalty(0.4, 1.0)).toBeLessThan(0);
  });
});
