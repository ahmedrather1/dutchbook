import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "./book";
import { Matcher, averagePrice, type MatchEvent } from "./match";
import { ticks } from "./money";

const TICK = 10; // 1¢

let book: OrderBook;
let m: Matcher;

beforeEach(() => {
  book = new OrderBook();
  m = new Matcher(book, TICK);
});

const fills = (events: MatchEvent[]) => events.filter((e) => e.kind === "fill");

describe("rejections", () => {
  it("names the specific reason", () => {
    expect(m.submit({ id: "a", side: "buy", type: "limit", qty: 0, price: ticks(500), owner: "p" })
      .events[0]).toMatchObject({ kind: "rejected", reason: "qty-not-positive-integer" });

    expect(m.submit({ id: "b", side: "buy", type: "limit", qty: 5, owner: "p" })
      .events[0]).toMatchObject({ kind: "rejected", reason: "limit-needs-price" });

    expect(m.submit({ id: "c", side: "buy", type: "limit", qty: 5, price: ticks(505), owner: "p" })
      .events[0]).toMatchObject({ kind: "rejected", reason: "price-off-tick" });

    expect(m.submit({ id: "d", side: "buy", type: "market", qty: 5, owner: "p" })
      .events[1]).toMatchObject({ kind: "rejected", reason: "no-liquidity" });
  });
});

describe("taking liquidity", () => {
  it("fills exactly when size matches", () => {
    m.seed("sell", ticks(650), 10);
    const r = m.submit({ id: "t", side: "buy", type: "market", qty: 10, owner: "p" });
    expect(r.filledQty).toBe(10);
    expect(r.notional).toBe(6500);
    expect(averagePrice(r)).toBe(650);
    expect(book.bestAsk()).toBeUndefined();
  });

  it("walks the book and the average price is worse than the quote (Ch 2)", () => {
    m.seed("sell", ticks(650), 10);
    m.seed("sell", ticks(660), 10);
    m.seed("sell", ticks(680), 30);

    const r = m.submit({ id: "t", side: "buy", type: "market", qty: 25, owner: "p" });

    expect(fills(r.events).map((f) => [f.price, f.qty])).toEqual([
      [650, 10],
      [660, 10],
      [680, 5],
    ]);
    expect(r.notional).toBe(6500 + 6600 + 3400);
    expect(averagePrice(r)).toBe(660);
    // The screen said 650. Slippage is the 1¢ between that and what you actually paid.
    expect(averagePrice(r)! - 650).toBe(10);
  });

  it("partially fills a market order and drops the remainder", () => {
    m.seed("sell", ticks(650), 4);
    const r = m.submit({ id: "t", side: "buy", type: "market", qty: 10, owner: "p" });
    expect(r.filledQty).toBe(4);
    expect(r.restingQty).toBe(0);
  });

  it("stops a limit order at its price and rests the remainder", () => {
    m.seed("sell", ticks(650), 5);
    m.seed("sell", ticks(700), 20);

    const r = m.submit({ id: "t", side: "buy", type: "limit", qty: 20, price: ticks(660), owner: "p" });

    expect(r.filledQty).toBe(5);
    expect(r.restingQty).toBe(15);
    expect(book.bestBid()).toBe(660);
    expect(r.events.at(-1)).toMatchObject({ kind: "resting", qty: 15 });
  });

  it("respects time priority within a price level", () => {
    const first = m.seed("sell", ticks(650), 5);
    const second = m.seed("sell", ticks(650), 5);
    const r = m.submit({ id: "t", side: "buy", type: "market", qty: 6, owner: "p" });
    expect(fills(r.events).map((f) => f.makerId)).toEqual([first.id, second.id]);
    expect(book.get(second.id)!.qty).toBe(4);
  });

  it("does not trade with itself", () => {
    m.seed("sell", ticks(650), 10, "p");
    const r = m.submit({ id: "t", side: "buy", type: "market", qty: 10, owner: "p" });
    expect(r.filledQty).toBe(0);
  });
});

describe("selling", () => {
  it("walks bids downward", () => {
    m.seed("buy", ticks(600), 10);
    m.seed("buy", ticks(580), 10);
    const r = m.submit({ id: "t", side: "sell", type: "market", qty: 15, owner: "p" });
    expect(fills(r.events).map((f) => f.price)).toEqual([600, 580]);
    expect(r.notional).toBe(6000 + 2900);
  });
});

describe("conservation", () => {
  it("fills never exceed the requested quantity or available depth", () => {
    m.seed("sell", ticks(650), 7);
    m.seed("sell", ticks(660), 3);
    const r = m.submit({ id: "t", side: "buy", type: "market", qty: 100, owner: "p" });
    const total = fills(r.events).reduce((n, f) => n + f.qty, 0);
    expect(total).toBe(10);
    expect(total).toBe(r.filledQty);
  });
});

describe("cancel", () => {
  it("removes a resting order and reports it once", () => {
    m.submit({ id: "r", side: "buy", type: "limit", qty: 5, price: ticks(600), owner: "p" });
    expect(m.cancel("r")).toMatchObject({ kind: "cancelled" });
    expect(m.cancel("r")).toMatchObject({ kind: "rejected" });
  });
});
