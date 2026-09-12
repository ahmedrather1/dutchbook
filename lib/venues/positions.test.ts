import { describe, it, expect } from "vitest";
import { split, merge, noAsYes, findDutchBook, findMultiOutcomeArb, convertNegativeRisk } from "./positions";
import { kalshi } from "./kalshi";
import { makePolymarket } from "./polymarket";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";

const freeVenue = makePolymarket("geopolitics"); // zero fees, isolates the arithmetic

describe("YES/NO identity", () => {
  it("turns a NO price into the equivalent YES price", () => {
    expect(noAsYes(ticks(300))).toBe(700);
    expect(noAsYes(noAsYes(ticks(420)))).toBe(420);
  });
});

describe("split and merge", () => {
  it("splits $1 into one of each", () => {
    const { pair, spent } = split(cents(5 * ONE_DOLLAR));
    expect(pair).toEqual({ yes: 5, no: 5 });
    expect(spent).toBe(5 * ONE_DOLLAR);
  });

  it("merges pairs back into exactly $1 each", () => {
    const { proceeds, remaining } = merge({ yes: 5, no: 5 });
    expect(proceeds).toBe(5 * ONE_DOLLAR);
    expect(remaining).toEqual({ yes: 0, no: 0 });
  });

  it("merges only what it can pair, leaving the rest", () => {
    const { proceeds, remaining } = merge({ yes: 7, no: 3 });
    expect(proceeds).toBe(3 * ONE_DOLLAR);
    expect(remaining).toEqual({ yes: 4, no: 0 });
  });

  it("round-trips: split then merge is a no-op", () => {
    const { pair, spent } = split(cents(10 * ONE_DOLLAR));
    expect(merge(pair).proceeds).toBe(spent);
  });
});

describe("findDutchBook", () => {
  it("finds a locked profit when YES + NO costs under $1", () => {
    const book = findDutchBook(freeVenue, ticks(600), 50, ticks(370), 80);
    expect(book.combined).toBe(970);
    expect(book.grossPerPair).toBe(30);
    expect(book.netPerPair).toBe(30);
    expect(book.maxPairs).toBe(50);
    expect(book.exists).toBe(true);
  });

  it("is limited by the thinner side, not the deeper one", () => {
    expect(findDutchBook(freeVenue, ticks(600), 5, ticks(370), 5000).maxPairs).toBe(5);
  });

  it("reports no arb when the pair costs more than $1", () => {
    const book = findDutchBook(freeVenue, ticks(600), 50, ticks(450), 50);
    expect(book.grossPerPair).toBeLessThan(0);
    expect(book.exists).toBe(false);
  });

  it("kills a thin gross edge once fees are charged (Ch 5 into Ch 6)", () => {
    // 1c gross on a near-coin-flip: Kalshi charges about 1.75c a side.
    const gross = findDutchBook(freeVenue, ticks(500), 100, ticks(490), 100);
    const withFees = findDutchBook(kalshi, ticks(500), 100, ticks(490), 100);
    expect(gross.exists).toBe(true);
    expect(withFees.grossPerPair).toBe(10);
    expect(withFees.netPerPair).toBeLessThan(0);
    expect(withFees.exists).toBe(false);
  });

  it("survives fees when the gross edge is wide enough", () => {
    const book = findDutchBook(kalshi, ticks(400), 100, ticks(500), 100);
    expect(book.grossPerPair).toBe(100);
    expect(book.netPerPair).toBeGreaterThan(0);
    expect(book.exists).toBe(true);
  });
});

describe("findMultiOutcomeArb", () => {
  const outcomes = (...asks: number[]) =>
    asks.map((ask, i) => ({ label: `o${i}`, ask: ticks(ask), depth: 100 }));

  it("finds an arb when every outcome together costs under $1", () => {
    const arb = findMultiOutcomeArb(freeVenue, outcomes(400, 350, 200));
    expect(arb.total).toBe(950);
    expect(arb.grossPerSet).toBe(50);
    expect(arb.exists).toBe(true);
  });

  it("reports none when the set sums above $1", () => {
    expect(findMultiOutcomeArb(freeVenue, outcomes(400, 400, 300)).exists).toBe(false);
  });

  it("is limited by the thinnest outcome", () => {
    const thin = [
      { label: "a", ask: ticks(400), depth: 100 },
      { label: "b", ask: ticks(350), depth: 3 },
      { label: "c", ask: ticks(200), depth: 100 },
    ];
    expect(findMultiOutcomeArb(freeVenue, thin).maxSets).toBe(3);
  });

  it("loses a marginal set to fees", () => {
    const arb = findMultiOutcomeArb(kalshi, outcomes(490, 330, 170));
    expect(arb.grossPerSet).toBeGreaterThan(0);
    expect(arb.netPerSet).toBeLessThan(arb.grossPerSet);
  });

  it("handles an empty set without dividing by zero", () => {
    expect(findMultiOutcomeArb(freeVenue, []).maxSets).toBe(0);
  });
});

describe("negative risk", () => {
  it("turns one NO into a YES on every other outcome", () => {
    expect(convertNegativeRisk(3, 1)).toBe(2);
    expect(convertNegativeRisk(5, 10)).toBe(40);
  });

  it("refuses a set too small to convert within", () => {
    expect(() => convertNegativeRisk(1, 1)).toThrow(RangeError);
  });
});
