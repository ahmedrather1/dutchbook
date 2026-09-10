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
  | { kind: "fill"; takerId: string; makerId: string; price: Ticks; qty: number; takerSide: Side }
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

  constructor(
    readonly book: OrderBook,
    private readonly tickSize: number,
  ) {}

  submit(req: OrderRequest): MatchResult {
    const events: MatchEvent[] = [];
    const reject = (reason: RejectReason): MatchResult => ({
      events: [{ kind: "rejected", id: req.id, reason }],
      filledQty: 0,
      notional: 0 as Cents,
      restingQty: 0,
    });

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

    return {
      events,
      filledQty: req.qty - remaining,
      notional: paid as Cents,
      restingQty: req.type === "limit" ? remaining : 0,
    };
  }

  cancel(id: string): MatchEvent {
    const gone = this.book.cancel(id);
    return gone ? { kind: "cancelled", id } : { kind: "rejected", id, reason: "no-liquidity" };
  }

  /** Seeds the book without going through matching, for scenario setup. */
  seed(side: Side, price: Ticks, qty: number, owner = "mm"): RestingOrder {
    const o: RestingOrder = { id: `seed-${++this.seq}`, side, price, qty, seq: this.seq, owner };
    this.book.insert(o);
    return o;
  }
}

/** Average fill price, in ticks. Undefined when nothing filled. */
export function averagePrice(r: MatchResult): Ticks | undefined {
  return r.filledQty === 0 ? undefined : ticks(Math.round(r.notional / r.filledQty));
}
