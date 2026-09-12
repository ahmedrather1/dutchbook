import { OrderBook, type RestingOrder, type Side } from "./book";
import { notional, ticks, type Cents, type Ticks } from "./money";

export type OrderType = "limit" | "market";

export interface OrderRequest {
  id: string;
  side: Side;
  type: OrderType;
  qty: number;
  /** Required for limit orders; ignored for market orders. */
  price?: Ticks;
  owner: string;
}

export type RejectReason =
  | "qty-not-positive-integer"
  | "limit-needs-price"
  | "price-off-tick"
  | "no-liquidity"
  | "duplicate-id";

export type MatchEvent =
  | { kind: "accepted"; id: string }
  | { kind: "rejected"; id: string; reason: RejectReason }
  | {
      kind: "fill";
      takerId: string;
      makerId: string;
      takerOwner: string;
      makerOwner: string;
      price: Ticks;
      qty: number;
      takerSide: Side;
    }
  | { kind: "resting"; id: string; price: Ticks; qty: number }
  | { kind: "cancelled"; id: string };

export interface MatchResult {
  events: MatchEvent[];
  filledQty: number;
  /** Total cash paid (buy) or received (sell) across all fills. */
  notional: Cents;
  restingQty: number;
}

/** A taker crosses when its price is at least as aggressive as the maker's. */
function crosses(takerSide: Side, takerPrice: Ticks, makerPrice: Ticks): boolean {
  return takerSide === "buy" ? takerPrice >= makerPrice : takerPrice <= makerPrice;
}

export class Matcher {
  private seq = 0;
  private journal: MatchEvent[] = [];

  constructor(
    readonly book: OrderBook,
    private readonly tickSize: number,
  ) {}

  submit(req: OrderRequest): MatchResult {
    const events: MatchEvent[] = [];
    const reject = (reason: RejectReason): MatchResult => {
      const rejection: MatchEvent = { kind: "rejected", id: req.id, reason };
      this.journal.push(rejection);
      return { events: [rejection], filledQty: 0, notional: 0 as Cents, restingQty: 0 };
    };

    if (!Number.isInteger(req.qty) || req.qty <= 0) return reject("qty-not-positive-integer");
    if (this.book.get(req.id)) return reject("duplicate-id");
    if (req.type === "limit") {
      if (req.price === undefined) return reject("limit-needs-price");
      if (req.price % this.tickSize !== 0) return reject("price-off-tick");
    }

    events.push({ kind: "accepted", id: req.id });

    const makerSide: Side = req.side === "buy" ? "sell" : "buy";
    let remaining = req.qty;
    let paid = 0;

    // The queue is already best-first, so walking it in order gives price-time priority.
    // Each level consumed is worse than the last — this is where slippage comes from.
    for (const maker of [...this.book.queue(makerSide)]) {
      if (remaining === 0) break;
      if (maker.owner === req.owner) continue;
      if (req.type === "limit" && !crosses(req.side, req.price!, maker.price)) break;

      const qty = Math.min(remaining, maker.qty);
      this.book.reduce(maker.id, qty);
      remaining -= qty;
      paid += notional(maker.price, qty);
      events.push({
        kind: "fill",
        takerId: req.id,
        makerId: maker.id,
        takerOwner: req.owner,
        makerOwner: maker.owner,
        price: maker.price,
        qty,
        takerSide: req.side,
      });
    }

    if (remaining > 0) {
      if (req.type === "market") {
        // A market order never rests; unfilled size is simply lost to thin liquidity.
        if (events.length === 1) events.push({ kind: "rejected", id: req.id, reason: "no-liquidity" });
      } else {
        const resting: RestingOrder = {
          id: req.id,
          side: req.side,
          price: req.price!,
          qty: remaining,
          seq: ++this.seq,
          owner: req.owner,
        };
        this.book.insert(resting);
        events.push({ kind: "resting", id: req.id, price: req.price!, qty: remaining });
      }
    }

    this.journal.push(...events);
    return {
      events,
      filledQty: req.qty - remaining,
      notional: paid as Cents,
      restingQty: req.type === "limit" ? remaining : 0,
    };
  }

  cancel(id: string): MatchEvent {
    const gone = this.book.cancel(id);
    const event: MatchEvent = gone
      ? { kind: "cancelled", id }
      : { kind: "rejected", id, reason: "no-liquidity" };
    this.journal.push(event);
    return event;
  }

  /** Everything that happened since the last call. The sim loop drains this each tick. */
  takeEvents(): MatchEvent[] {
    return this.journal.splice(0);
  }

  /**
   * Seeds the book without matching, for scenario setup only.
   *
   * The default owner is deliberately not any agent's id: self-trade prevention would
   * otherwise stop that agent's quotes from ever clearing the starting book, leaving it
   * crossed after a large move.
   */
  seed(side: Side, price: Ticks, qty: number, owner = "book"): RestingOrder {
    const o: RestingOrder = { id: `seed-${++this.seq}`, side, price, qty, seq: this.seq, owner };
    this.book.insert(o);
    return o;
  }
}

export interface FillEstimate {
  filledQty: number;
  notional: Cents;
  averagePrice: Ticks | undefined;
  /** The first price you would touch — the quote on screen. */
  bestPrice: Ticks | undefined;
  /** The worst price you would touch. */
  worstPrice: Ticks | undefined;
  /** How much worse your average is than the quote. This is the slippage. */
  slippage: number;
  /** Size you asked for that the book cannot supply. */
  shortfall: number;
}

/** What a market order would do, without doing it. Drives the pre-trade preview (E-4). */
export function estimateFill(book: OrderBook, side: Side, qty: number): FillEstimate {
  const makerSide: Side = side === "buy" ? "sell" : "buy";
  let remaining = qty;
  let paid = 0;
  let best: Ticks | undefined;
  let worst: Ticks | undefined;

  for (const maker of book.queue(makerSide)) {
    if (remaining === 0) break;
    const take = Math.min(remaining, maker.qty);
    remaining -= take;
    paid += take * maker.price;
    best ??= maker.price;
    worst = maker.price;
  }

  const filled = qty - remaining;
  const average = filled === 0 ? undefined : (Math.round(paid / filled) as Ticks);
  return {
    filledQty: filled,
    notional: paid as Cents,
    averagePrice: average,
    bestPrice: best,
    worstPrice: worst,
    // Buying, a worse average is higher; selling, it is lower.
    slippage:
      average === undefined || best === undefined ? 0 : Math.abs(average - best),
    shortfall: remaining,
  };
}

/** Average fill price, in ticks. Undefined when nothing filled. */
export function averagePrice(r: MatchResult): Ticks | undefined {
  return r.filledQty === 0 ? undefined : ticks(Math.round(r.notional / r.filledQty));
}
