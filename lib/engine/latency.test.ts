import { describe, it, expect, beforeEach } from "vitest";
import { OrderBook } from "./book";
import { Matcher } from "./match";
import { LatencyQueue, NO_LATENCY, queuePosition } from "./latency";
import { ticks } from "./money";

let matcher: Matcher;

beforeEach(() => {
  matcher = new Matcher(new OrderBook(), 10);
});

const order = (id: string, qty: number) =>
  ({ id, side: "buy", type: "market", qty, owner: "player" }) as const;

describe("LatencyQueue", () => {
  it("holds an order until its arrival tick", () => {
    const q = new LatencyQueue(matcher, { ...NO_LATENCY, submitTicks: 3 });
    matcher.seed("sell", ticks(650), 10);

    q.submit(order("a", 5), 1);
    expect(q.release(3)).toHaveLength(0);
    expect(q.release(4)).not.toHaveLength(0);
    expect(q.inFlight).toBe(0);
  });

  it("lets a faster agent take the liquidity first (Ch 9)", () => {
    const q = new LatencyQueue(matcher, { ...NO_LATENCY, submitTicks: 2 });
    matcher.seed("sell", ticks(650), 10);

    q.submit(order("slow", 10), 1);
    // The fast agent has no latency and arrives on tick 1.
    matcher.submit({ id: "fast", side: "buy", type: "market", qty: 10, owner: "hft" });

    const events = q.release(3);
    expect(events.some((e) => e.kind === "fill")).toBe(false);
    expect(events.some((e) => e.kind === "rejected" && e.reason === "no-liquidity")).toBe(true);
  });

  it("delays cancels too, so a stale quote can still be hit", () => {
    const q = new LatencyQueue(matcher, { ...NO_LATENCY, cancelTicks: 2 });
    matcher.submit({ id: "mine", side: "sell", type: "limit", qty: 10, price: ticks(650), owner: "player" });

    q.cancel("mine", 1);
    matcher.submit({ id: "taker", side: "buy", type: "market", qty: 10, owner: "hft" });

    // By the time the cancel lands the order is already gone — taken, not cancelled.
    expect(q.release(3)[0]).toMatchObject({ kind: "rejected" });
  });

  it("releases in submission order", () => {
    const q = new LatencyQueue(matcher, { ...NO_LATENCY, submitTicks: 1 });
    matcher.seed("sell", ticks(650), 100);
    q.submit(order("first", 1), 1);
    q.submit(order("second", 1), 1);
    const ids = q.release(2).filter((e) => e.kind === "accepted").map((e) => e.id);
    expect(ids).toEqual(["first", "second"]);
  });
});

describe("queuePosition", () => {
  it("counts contracts ahead, and is undefined once filled", () => {
    matcher.seed("buy", ticks(600), 400, "mm");
    matcher.submit({ id: "mine", side: "buy", type: "limit", qty: 10, price: ticks(600), owner: "player" });
    expect(queuePosition(matcher, "mine")).toBe(400);

    matcher.submit({ id: "sweep", side: "sell", type: "market", qty: 410, owner: "hft" });
    expect(queuePosition(matcher, "mine")).toBeUndefined();
  });
});
