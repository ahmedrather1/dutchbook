import { cents, type Cents, type Ticks } from "@/lib/engine/money";
import { estimateFill } from "@/lib/engine/match";
import type { OrderBook, Side } from "@/lib/engine/book";
import type { Venue } from "./venue";

/**
 * The all-in cost of a trade, itemised.
 *
 * Chapter 5 renders this breakdown directly: one number tells a player nothing, but four
 * numbers show them exactly where an apparent edge went.
 */
export interface CostBreakdown {
  /** What the quoted best price would have cost, if size were unlimited. */
  atQuote: Cents;
  /** What walking the book actually costs. */
  actual: Cents;
  /** actual − atQuote. The cost of your own size. */
  slippage: Cents;
  /** Half the spread, per contract, against the mid. */
  spreadCost: Cents;
  fee: Cents;
  /** Everything you give up: slippage + spread + fee. */
  totalCost: Cents;
  filledQty: number;
  shortfall: number;
  averagePrice: Ticks | undefined;
}

export function costOfTrade(
  venue: Venue,
  book: OrderBook,
  side: Side,
  qty: number,
): CostBreakdown {
  const fill = estimateFill(book, side, qty);
  const bid = book.bestBid();
  const ask = book.bestAsk();
  const mid = bid !== undefined && ask !== undefined ? (bid + ask) / 2 : undefined;

  const atQuote = cents(fill.bestPrice === undefined ? 0 : fill.bestPrice * fill.filledQty);
  const actual = fill.notional;
  const slippage = cents(Math.abs(actual - atQuote));

  const spreadCost =
    mid === undefined || fill.bestPrice === undefined
      ? cents(0)
      : cents(Math.round(Math.abs(fill.bestPrice - mid) * fill.filledQty));

  const fee =
    fill.averagePrice === undefined
      ? cents(0)
      : venue.fee({ qty: fill.filledQty, price: fill.averagePrice, role: "taker" });

  return {
    atQuote,
    actual,
    slippage,
    spreadCost,
    fee,
    totalCost: cents(slippage + spreadCost + fee),
    filledQty: fill.filledQty,
    shortfall: fill.shortfall,
    averagePrice: fill.averagePrice,
  };
}

/**
 * The minimum gross edge, in ticks per contract, that clears all costs at this size.
 * Chapter 5's punchline: below this number a visible edge is a losing trade.
 */
export function breakEvenEdge(venue: Venue, book: OrderBook, side: Side, qty: number): number {
  const breakdown = costOfTrade(venue, book, side, qty);
  return breakdown.filledQty === 0 ? Infinity : breakdown.totalCost / breakdown.filledQty;
}
