import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "@/lib/engine/book";
import { Matcher } from "@/lib/engine/match";
import { ticks } from "@/lib/engine/money";
import { costOfTrade, breakEvenEdge } from "./cost";
import { kalshi } from "./kalshi";
import { makePolymarket } from "./polymarket";

const free = makePolymarket("geopolitics");
let book: OrderBook;

beforeEach(() => {
  book = new OrderBook();
  const m = new Matcher(book, 10);
  m.seed("buy", ticks(560), 50);
  m.seed("sell", ticks(600), 10);
  m.seed("sell", ticks(620), 10);
  m.seed("sell", ticks(660), 100);
});

describe("costOfTrade", () => {
  it("charges nothing extra when the best price covers the whole order", () => {
    const c = costOfTrade(free, book, "buy", 10);
    expect(c.slippage).toBe(0);
    expect(c.actual).toBe(6000);
    expect(c.filledQty).toBe(10);
  });

  it("separates slippage from the quote once the order walks", () => {
    const c = costOfTrade(free, book, "buy", 25);
    // 10@600 + 10@620 + 5@660 = 6000 + 6200 + 3300 = 15500
    expect(c.actual).toBe(15500);
    expect(c.atQuote).toBe(25 * 600);
    expect(c.slippage).toBe(500);
    expect(c.averagePrice).toBe(620);
  });

  it("counts the spread against mid as a real cost (Ch 5)", () => {
    const c = costOfTrade(free, book, "buy", 10);
    // mid is (560 + 600) / 2 = 580; buying at 600 is 20 ticks over mid.
    expect(c.spreadCost).toBe(200);
  });

  it("adds the venue fee, and zero-fee venues add nothing", () => {
    const paid = costOfTrade(kalshi, book, "buy", 10);
    const gratis = costOfTrade(free, book, "buy", 10);
    expect(paid.fee).toBeGreaterThan(0);
    expect(gratis.fee).toBe(0);
    expect(paid.totalCost).toBeGreaterThan(gratis.totalCost);
  });

  it("reports what the book cannot supply", () => {
    const c = costOfTrade(free, book, "buy", 500);
    expect(c.shortfall).toBe(380);
    expect(c.filledQty).toBe(120);
  });

  it("totals its own itemisation", () => {
    const c = costOfTrade(kalshi, book, "buy", 25);
    expect(c.totalCost).toBe(c.slippage + c.spreadCost + c.fee);
  });
});

describe("breakEvenEdge", () => {
  it("is the per-contract edge a trade must clear to be worth doing", () => {
    const edge = breakEvenEdge(kalshi, book, "buy", 10);
    const c = costOfTrade(kalshi, book, "buy", 10);
    expect(edge).toBeCloseTo(c.totalCost / 10, 6);
    expect(edge).toBeGreaterThan(0);
  });

  it("rises with size, because bigger orders walk further", () => {
    expect(breakEvenEdge(kalshi, book, "buy", 25)).toBeGreaterThan(
      breakEvenEdge(kalshi, book, "buy", 10),
    );
  });

  it("is infinite when nothing can fill", () => {
    expect(breakEvenEdge(kalshi, new OrderBook(), "buy", 10)).toBe(Infinity);
  });
});
