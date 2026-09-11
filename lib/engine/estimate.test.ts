import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "./book";
import { estimateFill, Matcher } from "./match";
import { ticks } from "./money";

let book: OrderBook;
let m: Matcher;

beforeEach(() => {
  book = new OrderBook();
  m = new Matcher(book, 10);
  m.seed("sell", ticks(650), 10);
  m.seed("sell", ticks(660), 10);
  m.seed("sell", ticks(680), 30);
});

describe("estimateFill", () => {
  it("matches what the matcher actually does", () => {
    const estimate = estimateFill(book, "buy", 25);
    const actual = m.submit({ id: "t", side: "buy", type: "market", qty: 25, owner: "p" });
    expect(estimate.filledQty).toBe(actual.filledQty);
    expect(estimate.notional).toBe(actual.notional);
  });

  it("does not touch the book", () => {
    estimateFill(book, "buy", 25);
    expect(book.bestAsk()).toBe(650);
    expect(book.depthAt("sell", ticks(650))).toBe(10);
  });

  it("separates the quote you saw from the average you get", () => {
    const e = estimateFill(book, "buy", 25);
    expect(e.bestPrice).toBe(650);
    expect(e.averagePrice).toBe(660);
    expect(e.worstPrice).toBe(680);
    expect(e.slippage).toBe(10); // 1¢ worse than the quote
  });

  it("reports no slippage when the best price covers the whole order", () => {
    expect(estimateFill(book, "buy", 10).slippage).toBe(0);
  });

  it("reports shortfall when the book is too thin", () => {
    const e = estimateFill(book, "buy", 100);
    expect(e.filledQty).toBe(50);
    expect(e.shortfall).toBe(50);
  });

  it("returns nothing on an empty side", () => {
    const e = estimateFill(book, "sell", 10);
    expect(e).toMatchObject({ filledQty: 0, shortfall: 10, averagePrice: undefined, slippage: 0 });
  });
});
