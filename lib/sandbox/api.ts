import type { Ticks } from "@/lib/engine/money";

/**
 * The API a player's strategy is written against.
 *
 * Deliberately shaped like a real exchange client: read a book, read your position,
 * place an order. Knowledge written here should transfer to a live bot (D22).
 */

export interface BookLevel {
  price: number;
  qty: number;
}

export interface MarketView {
  /** Best bid, or undefined if nobody is bidding. */
  bestBid?: number;
  bestAsk?: number;
  /** Best-first, aggregated by price. */
  bids: BookLevel[];
  asks: BookLevel[];
  /** Ask minus bid, or undefined on a one-sided book. */
  spread?: number;
}

export interface AccountView {
  /** Your own orders currently resting in the book. */
  resting: { side: "buy" | "sell"; price: number; qty: number }[];
  /** Contracts held. Negative is short. */
  position: number;
  /** Cash in sub-cent units; 1000 = $1.00. */
  cash: number;
  realised: number;
  /** Cash that a short position is holding aside. */
  locked: number;
}

export interface StrategyContext {
  tick: number;
  ticksRemaining: number;
  market: MarketView;
  account: AccountView;
  /** Available to the strategy for scratch state between ticks. */
  memory: Record<string, unknown>;
  /** Surfaces in the player's console. */
  log: (...args: unknown[]) => void;
}

export type Action =
  /** Omit `price` to take liquidity now; give one to rest a limit order. */
  | { type: "buy"; qty: number; price?: number }
  | { type: "sell"; qty: number; price?: number }
  /** Cancels every resting order you have. */
  | { type: "cancel" }
  | { type: "hold" };

export type Strategy = (ctx: StrategyContext) => Action | Action[] | void;

/** Prices are sub-cent units; $1.00 is 1000. Exposed so strategies can stay integral. */
export const DOLLAR = 1000;

export function toTicks(price: number): Ticks {
  return price as Ticks;
}

export const STARTER_TEMPLATE = `// Called once per tick. Return an action, or nothing to do nothing.
//
//   ctx.market.bestBid / bestAsk / bids / asks   the order book
//   ctx.account.position / cash                  where you stand
//   ctx.account.resting                          your own orders waiting
//   ctx.memory                                   your own scratch space
//   ctx.log(...)                                 prints to the console below
//
// Prices are in sub-cent units: 1000 = $1.00, so 620 = $0.62.
//
// Actions:
//   { type: "buy",  qty: 10 }             take the best offer now
//   { type: "buy",  qty: 10, price: 480 } rest a bid at $0.48 and wait
//   { type: "sell", qty: 10, price: 520 } rest an offer at $0.52
//   { type: "cancel" }                    pull all your resting orders
//   { type: "hold" }                      do nothing

function onTick(ctx) {
  // Your strategy goes here.
  return { type: "hold" };
}
`;
