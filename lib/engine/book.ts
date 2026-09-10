import { ticks, type Ticks } from "./money";

export type Side = "buy" | "sell";

export interface RestingOrder {
  id: string;
  side: Side;
  price: Ticks;
  qty: number;
  /** Monotonic sequence number: lower is earlier, which is what gives time priority. */
  seq: number;
  owner: string;
}

export interface Level {
  price: Ticks;
  qty: number;
  orders: RestingOrder[];
}

/**
 * Two-sided book with price-time priority.
 *
 * Bids and asks are kept sorted by aggressiveness (best first) so the matcher can
 * walk them in fill order without re-sorting on every trade.
 */
export class OrderBook {
  private bids: RestingOrder[] = [];
  private asks: RestingOrder[] = [];
  private byId = new Map<string, RestingOrder>();

  private side(side: Side): RestingOrder[] {
    return side === "buy" ? this.bids : this.asks;
  }

  /** Best-first: highest bid, lowest ask. Ties break on seq (earliest first). */
  private static rank(side: Side, a: RestingOrder, b: RestingOrder): number {
    const byPrice = side === "buy" ? b.price - a.price : a.price - b.price;
    return byPrice !== 0 ? byPrice : a.seq - b.seq;
  }

  insert(order: RestingOrder): void {
    if (this.byId.has(order.id)) throw new Error(`duplicate order id: ${order.id}`);
    if (!Number.isInteger(order.qty) || order.qty <= 0) {
      throw new RangeError(`qty must be a positive integer: ${order.qty}`);
    }
    const list = this.side(order.side);
    const at = list.findIndex((o) => OrderBook.rank(order.side, order, o) < 0);
    list.splice(at === -1 ? list.length : at, 0, order);
    this.byId.set(order.id, order);
  }

  cancel(id: string): RestingOrder | undefined {
    const order = this.byId.get(id);
    if (!order) return undefined;
    this.byId.delete(id);
    const list = this.side(order.side);
    list.splice(list.indexOf(order), 1);
    return order;
  }

  /** Reduce a resting order's size in place; removes it when it reaches zero. */
  reduce(id: string, by: number): void {
    const order = this.byId.get(id);
    if (!order) throw new Error(`no such order: ${id}`);
    if (by > order.qty) throw new RangeError(`cannot reduce ${id} by ${by} of ${order.qty}`);
    order.qty -= by;
    if (order.qty === 0) this.cancel(id);
  }

  get(id: string): RestingOrder | undefined {
    return this.byId.get(id);
  }

  /** Best-first resting orders on a side. The matcher consumes this in order. */
  queue(side: Side): readonly RestingOrder[] {
    return this.side(side);
  }

  bestBid(): Ticks | undefined {
    return this.bids[0]?.price;
  }

  bestAsk(): Ticks | undefined {
    return this.asks[0]?.price;
  }

  spread(): Ticks | undefined {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    return bid === undefined || ask === undefined ? undefined : ticks(ask - bid);
  }

  /** Total size resting at a price on a side. */
  depthAt(side: Side, price: Ticks): number {
    return this.side(side)
      .filter((o) => o.price === price)
      .reduce((n, o) => n + o.qty, 0);
  }

  /** How many contracts sit ahead of `id` at its own price — its queue position. */
  aheadOf(id: string): number {
    const order = this.byId.get(id);
    if (!order) throw new Error(`no such order: ${id}`);
    return this.side(order.side)
      .filter((o) => o.price === order.price && o.seq < order.seq)
      .reduce((n, o) => n + o.qty, 0);
  }

  /** Aggregated levels, best first. This is what the UI renders. */
  levels(side: Side, limit = 20): Level[] {
    const out: Level[] = [];
    for (const o of this.side(side)) {
      const last = out[out.length - 1];
      if (last && last.price === o.price) {
        last.qty += o.qty;
        last.orders.push(o);
      } else {
        if (out.length === limit) break;
        out.push({ price: o.price, qty: o.qty, orders: [o] });
      }
    }
    return out;
  }

  isCrossed(): boolean {
    const bid = this.bestBid();
    const ask = this.bestAsk();
    return bid !== undefined && ask !== undefined && bid >= ask;
  }

  snapshot(): { bids: Level[]; asks: Level[] } {
    return { bids: this.levels("buy"), asks: this.levels("sell") };
  }
}
