import { describe, it, expect } from "vitest";
import { Portfolio } from "./portfolio";
import { cents, ticks, ONE_DOLLAR } from "./money";
import { makeRng } from "./rng";

const START = cents(100 * ONE_DOLLAR); // $100

describe("Portfolio basics", () => {
  it("tracks cost and cash on a buy", () => {
    const p = new Portfolio(START);
    p.apply("buy", ticks(600), 10);
    expect(p.position).toBe(10);
    expect(p.averageCost).toBe(600);
    expect(p.cash).toBe(START - 6000);
    expect(p.realised).toBe(0);
  });

  it("averages cost across two buys at different prices", () => {
    const p = new Portfolio(START);
    p.apply("buy", ticks(600), 10);
    p.apply("buy", ticks(700), 10);
    expect(p.averageCost).toBe(650);
  });

  it("realises P&L only on the closing portion", () => {
    const p = new Portfolio(START);
    p.apply("buy", ticks(600), 10);
    p.apply("sell", ticks(650), 4);
    expect(p.realised).toBe(4 * 50);
    expect(p.position).toBe(6);
    expect(p.averageCost).toBe(600);
  });

  it("resets average cost when flat", () => {
    const p = new Portfolio(START);
    p.apply("buy", ticks(600), 10);
    p.apply("sell", ticks(620), 10);
    expect(p.position).toBe(0);
    expect(p.averageCost).toBe(0);
    expect(p.realised).toBe(200);
  });

  it("profits on a short that falls", () => {
    const p = new Portfolio(START);
    p.apply("sell", ticks(700), 10);
    expect(p.position).toBe(-10);
    p.apply("buy", ticks(600), 10);
    expect(p.realised).toBe(1000);
  });
});

describe("locked capital", () => {
  it("reserves $1 per short contract and removes it from buying power (Ch 10)", () => {
    const p = new Portfolio(START);
    p.apply("sell", ticks(700), 10);
    expect(p.lockedCapital).toBe(10 * ONE_DOLLAR);
    expect(p.cash).toBe(START + 7000);
    expect(p.buyingPower).toBe(START + 7000 - 10 * ONE_DOLLAR);
  });

  it("locks nothing when long", () => {
    const p = new Portfolio(START);
    p.apply("buy", ticks(600), 10);
    expect(p.lockedCapital).toBe(0);
  });
});

describe("settlement", () => {
  it("pays $1 per contract when a long position resolves YES", () => {
    const p = new Portfolio(START);
    p.apply("buy", ticks(300), 10);
    p.settle("yes");
    expect(p.position).toBe(0);
    expect(p.cash).toBe(START - 3000 + 10 * ONE_DOLLAR);
    expect(p.realised).toBe(10 * (ONE_DOLLAR - 300));
  });

  it("writes a long position to zero when it resolves NO", () => {
    const p = new Portfolio(START);
    p.apply("buy", ticks(300), 10);
    p.settle("no");
    expect(p.cash).toBe(START - 3000);
    expect(p.realised).toBe(-3000);
  });

  it("is a no-op when flat", () => {
    const p = new Portfolio(START);
    p.settle("yes");
    expect(p.cash).toBe(START);
  });
});

describe("the P&L identity", () => {
  it("equity minus starting cash equals realised plus unrealised, over random trades", () => {
    const rng = makeRng(2024);
    for (let trial = 0; trial < 200; trial++) {
      const p = new Portfolio(START);
      for (let i = 0; i < 12; i++) {
        p.apply(rng.bool(0.5) ? "buy" : "sell", ticks(rng.int(5, 99) * 10), rng.int(1, 20));
      }
      const mark = ticks(rng.int(5, 99) * 10);
      expect(p.equity(mark) - START).toBe(p.realised + p.unrealised(mark));
    }
  });
});
