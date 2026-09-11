import { describe, it, expect } from "vitest";
import { runScenario, serialise, PLAYER, type PlayerAction } from "./sim";
import { calmMarket, newsShock } from "./scenarios.fixture";
import { ticks } from "./money";

const buy = (atTick: number, qty: number): PlayerAction => ({
  atTick,
  kind: "submit",
  order: { id: `${PLAYER}-buy-${atTick}`, side: "buy", type: "market", qty },
});

describe("determinism (D18)", () => {
  it("produces a byte-identical log across repeated runs", () => {
    const a = runScenario(calmMarket);
    const b = runScenario(calmMarket);
    expect(a.log).toBe(b.log);
    expect(a.log.length).toBeGreaterThan(0);
  });

  it("produces a byte-identical log with the same player actions replayed", () => {
    const actions = [buy(5, 10), buy(12, 5)];
    expect(runScenario(calmMarket, actions).log).toBe(runScenario(calmMarket, actions).log);
  });

  it("diverges when the seed changes", () => {
    const other = { ...calmMarket, seed: calmMarket.seed + 1 };
    expect(runScenario(calmMarket).log).not.toBe(runScenario(other).log);
  });

  it("diverges when the player acts", () => {
    expect(runScenario(calmMarket).log).not.toBe(runScenario(calmMarket, [buy(5, 10)]).log);
  });

  it("gives fresh agent state to each run, so state cannot leak between them", () => {
    const first = runScenario(newsShock);
    runScenario(newsShock, [buy(3, 30)]);
    expect(runScenario(newsShock).log).toBe(first.log);
  });
});

describe("serialise", () => {
  it("is stable and one line per event", () => {
    const r = runScenario(calmMarket);
    expect(r.log.split("\n")).toHaveLength(r.events.length);
    expect(serialise(r.events)).toBe(r.log);
    expect(r.log.split("\n")[0]).toMatch(/^\d+\|\w+\|/);
  });
});

describe("the player in a running market", () => {
  it("accounts for a market buy against the live book", () => {
    const r = runScenario(calmMarket, [buy(5, 10)]);
    expect(r.portfolio.position).toBe(10);
    expect(r.portfolio.cash).toBeLessThan(calmMarket.startingCash);
    expect(r.portfolio.averageCost).toBeGreaterThan(0);
  });

  it("settles the position when the market resolves", () => {
    const r = runScenario(newsShock, [buy(5, 10)]);
    expect(r.portfolio.position).toBe(0);
    expect(r.events.at(-1)?.event).toMatchObject({ kind: "resolved", outcome: "yes" });
  });

  it("pays $1 per contract on a YES resolution", () => {
    const r = runScenario(newsShock, [buy(5, 10)]);
    // Flat after settlement, so every gain is realised and sits in cash.
    expect(r.portfolio.cash).toBe(newsShock.startingCash + r.portfolio.realised);
    // Bought below $1 before the news, settled at $1.
    expect(r.portfolio.realised).toBeGreaterThan(0);
  });
});

describe("the market itself", () => {
  it("keeps a two-sided book with a sane spread", () => {
    const { book } = runScenario(calmMarket);
    expect(book.bestBid()).toBeDefined();
    expect(book.bestAsk()).toBeDefined();
    expect(book.isCrossed()).toBe(false);
  });

  it("reprices after news, so a stale quote is a real risk (Ch 9)", () => {
    const { book } = runScenario(newsShock);
    expect(book.bestBid()!).toBeGreaterThan(ticks(700));
  });
});
