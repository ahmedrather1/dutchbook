import { describe, it, expect } from "vitest";
import { OrderBook, type Side } from "./book";
import { ticks } from "./money";
import { makeRng } from "./rng";

let seq = 0;
const order = (side: Side, price: number, qty: number, owner = "mm") => ({
  id: `o${++seq}`,
  side,
  price: ticks(price),
  qty,
  seq,
  owner,
});

describe("OrderBook ordering", () => {
  it("ranks bids high-first and asks low-first", () => {
    const b = new OrderBook();
    b.insert(order("buy", 600, 10));
    b.insert(order("buy", 620, 10));
    b.insert(order("sell", 680, 10));
    b.insert(order("sell", 650, 10));
    expect(b.bestBid()).toBe(620);
    expect(b.bestAsk()).toBe(650);
    expect(b.spread()).toBe(30);
  });

  it("breaks price ties by arrival, oldest first", () => {
    const b = new OrderBook();
    const first = order("buy", 620, 10);
    const second = order("buy", 620, 5);
    b.insert(first);
    b.insert(second);
    expect(b.queue("buy").map((o) => o.id)).toEqual([first.id, second.id]);
  });

  it("reports queue position as contracts ahead, not orders ahead", () => {
    const b = new OrderBook();
    b.insert(order("buy", 620, 400));
    b.insert(order("buy", 620, 100));
    const mine = order("buy", 620, 25, "player");
    b.insert(mine);
    expect(b.aheadOf(mine.id)).toBe(500);
  });
});

describe("OrderBook mutation", () => {
  it("removes a level once its last order is cancelled", () => {
    const b = new OrderBook();
    const o = order("sell", 700, 10);
    b.insert(o);
    b.cancel(o.id);
    expect(b.bestAsk()).toBeUndefined();
    expect(b.levels("sell")).toHaveLength(0);
  });

  it("treats cancelling an unknown order as a no-op, not an error", () => {
    expect(new OrderBook().cancel("gone")).toBeUndefined();
  });

  it("drops an order reduced to zero", () => {
    const b = new OrderBook();
    const o = order("buy", 500, 10);
    b.insert(o);
    b.reduce(o.id, 10);
    expect(b.get(o.id)).toBeUndefined();
    expect(b.bestBid()).toBeUndefined();
  });

  it("refuses to over-reduce or duplicate an id", () => {
    const b = new OrderBook();
    const o = order("buy", 500, 10);
    b.insert(o);
    expect(() => b.reduce(o.id, 11)).toThrow(RangeError);
    expect(() => b.insert(o)).toThrow(/duplicate/);
  });
});

describe("OrderBook levels", () => {
  it("aggregates size at a price and caps at the limit", () => {
    const b = new OrderBook();
    b.insert(order("sell", 650, 10));
    b.insert(order("sell", 650, 15));
    b.insert(order("sell", 660, 5));
    const levels = b.levels("sell");
    expect(levels[0]).toMatchObject({ price: 650, qty: 25 });
    expect(b.depthAt("sell", ticks(650))).toBe(25);
    expect(b.levels("sell", 1)).toHaveLength(1);
  });
});

describe("OrderBook invariants under random mutation", () => {
  it("stays uncrossed, positive, and best-first across 3000 seeded operations", () => {
    const rng = makeRng(1234);
    const b = new OrderBook();
    const live: string[] = [];

    const checkInvariants = () => {
      expect(b.isCrossed()).toBe(false);
      for (const side of ["buy", "sell"] as const) {
        const prices = b.queue(side).map((o) => o.price);
        const sorted = [...prices].sort((x, y) => (side === "buy" ? y - x : x - y));
        expect(prices).toEqual(sorted);
        for (const o of b.queue(side)) expect(o.qty).toBeGreaterThan(0);
      }
    };

    for (let i = 0; i < 3000; i++) {
      const roll = rng.next();
      if (roll < 0.6 || live.length === 0) {
        // The two sides are kept apart so the book stays uncrossed without a matcher.
        const side: Side = rng.bool(0.5) ? "buy" : "sell";
        const price = side === "buy" ? rng.int(300, 490) : rng.int(510, 700);
        const o = order(side, price, rng.int(1, 100));
        b.insert(o);
        live.push(o.id);
      } else {
        const at = rng.int(0, live.length - 1);
        const id = live[at]!;
        const before = b.get(id)!.qty;
        const by = roll < 0.85 ? before : rng.int(1, before);
        b.reduce(id, by);
        if (by === before) live.splice(at, 1);
      }

      if (i % 100 === 0) checkInvariants();
    }

    checkInvariants();
    expect(b.queue("buy").length + b.queue("sell").length).toBe(live.length);
  });
});
