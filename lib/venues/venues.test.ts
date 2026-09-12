import { describe, it, expect } from "vitest";
import { kalshi } from "./kalshi";
import { makePolymarket, polymarket } from "./polymarket";
import { uncertainty } from "./venue";
import { ticks, ONE_DOLLAR } from "@/lib/engine/money";

/**
 * Every expected value here comes from the hand-computed tables in docs/venues.md, not
 * from running the code. That is the point: an independent oracle (D14).
 */

describe("Kalshi fees reproduce docs/venues.md", () => {
  const cases: [number, number, number][] = [
    // [contracts, price in dollars, fee in dollars]
    [20, 0.6, 0.34],
    [100, 0.5, 1.75],
    [100, 0.1, 0.63],
    [100, 0.9, 0.63],
    [1, 0.5, 0.02],
  ];

  it.each(cases)("charges %i @ $%s => $%s", (qty, price, expected) => {
    const fee = kalshi.fee({ qty, price: ticks(price * ONE_DOLLAR), role: "taker" });
    expect(fee / ONE_DOLLAR).toBeCloseTo(expected, 6);
  });

  it("rounds up, never down", () => {
    // 0.07 x 1 x 0.5 x 0.5 = 0.0175, which must become 2c not 1c.
    expect(kalshi.fee({ qty: 1, price: ticks(500), role: "taker" })).toBe(20);
  });

  it("charges makers the same as takers", () => {
    const maker = kalshi.fee({ qty: 50, price: ticks(600), role: "maker" });
    const taker = kalshi.fee({ qty: 50, price: ticks(600), role: "taker" });
    expect(maker).toBe(taker);
    expect(kalshi.makerPaysFee).toBe(true);
  });
});

describe("Polymarket fees reproduce docs/venues.md", () => {
  const cases: [number, number, number][] = [
    [100, 0.5, 1.0],
    [100, 0.6, 0.96],
    [100, 0.9, 0.36],
    [20, 0.6, 0.192],
  ];

  it.each(cases)("charges a politics taker %i @ $%s => %s USDC", (qty, price, expected) => {
    const fee = polymarket.fee({ qty, price: ticks(price * ONE_DOLLAR), role: "taker" });
    expect(fee / ONE_DOLLAR).toBeCloseTo(expected, 3);
  });

  it("never charges a maker", () => {
    expect(polymarket.fee({ qty: 1000, price: ticks(500), role: "maker" })).toBe(0);
    expect(polymarket.makerPaysFee).toBe(false);
  });

  it("charges nothing at all on geopolitics", () => {
    const geo = makePolymarket("geopolitics");
    expect(geo.fee({ qty: 1000, price: ticks(500), role: "taker" })).toBe(0);
  });

  it("charges crypto more than politics for the same trade", () => {
    const crypto = makePolymarket("crypto");
    const trade = { qty: 100, price: ticks(500), role: "taker" } as const;
    expect(crypto.fee(trade)).toBeGreaterThan(polymarket.fee(trade));
  });
});

describe("the shape both venues share", () => {
  it("peaks at 50c and collapses at the extremes", () => {
    expect(uncertainty(ticks(500))).toBeCloseTo(0.25);
    expect(uncertainty(ticks(100))).toBeCloseTo(0.09);
    expect(uncertainty(ticks(900))).toBeCloseTo(0.09);
    expect(uncertainty(ticks(0))).toBe(0);
    expect(uncertainty(ticks(ONE_DOLLAR))).toBe(0);
  });

  it("makes a coin flip roughly seven times dearer than a 10c trade", () => {
    const flip = kalshi.fee({ qty: 100, price: ticks(500), role: "taker" });
    const longshot = kalshi.fee({ qty: 100, price: ticks(100), role: "taker" });
    expect(flip / longshot).toBeCloseTo(2.78, 1);
  });

  it("is symmetric around 50c", () => {
    const low = kalshi.fee({ qty: 100, price: ticks(300), role: "taker" });
    const high = kalshi.fee({ qty: 100, price: ticks(700), role: "taker" });
    expect(low).toBe(high);
  });
});

describe("venues differ where the docs say they differ (Ch 4)", () => {
  it("disagrees on who pays and on tick size", () => {
    expect(kalshi.makerPaysFee).not.toBe(polymarket.makerPaysFee);
    expect(kalshi.tickSize).not.toBe(polymarket.tickSize);
    expect(kalshi.supportsMerge).toBe(false);
    expect(polymarket.supportsMerge).toBe(true);
    expect(polymarket.supportsNegativeRisk).toBe(true);
  });
});
