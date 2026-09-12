import { ONE_DOLLAR, type Cents, type Ticks } from "@/lib/engine/money";

export type Role = "maker" | "taker";

export interface FeeInput {
  qty: number;
  price: Ticks;
  role: Role;
}

export interface Venue {
  readonly id: "kalshi" | "polymarket";
  readonly name: string;
  /** Minimum price increment, in ticks. */
  readonly tickSize: number;
  readonly currency: string;
  /** Fee for one fill, in the same integer units as cash. */
  fee(input: FeeInput): Cents;
  /** Whether a resting order can earn a rebate rather than pay a fee. */
  readonly makerPaysFee: boolean;
  /** Merge a YES+NO pair back into $1 of collateral. */
  readonly supportsMerge: boolean;
  readonly supportsNegativeRisk: boolean;
  readonly sourceNote: string;
}

/** Price as a 0..1 fraction, which is the form both fee formulas are written in. */
export function asProbability(price: Ticks): number {
  return price / ONE_DOLLAR;
}

/** The shared shape of both venues' fees: most expensive at 50¢, cheapest at the extremes. */
export function uncertainty(price: Ticks): number {
  const p = asProbability(price);
  return p * (1 - p);
}

/**
 * Both venues compute `rate × C × P × (1 − P)`. Done in floats that lands on values like
 * 1750.0000000000002, and rounding *up* then overcharges by a whole cent. Everything is
 * kept integral until one final divide (D20).
 *
 * @param rateBasisPoints fee rate × 10000, e.g. 0.07 becomes 700.
 * @returns the fee in cash units, unrounded.
 */
export function rawFeeUnits(qty: number, price: Ticks, rateBasisPoints: number): number {
  const numerator = qty * price * (ONE_DOLLAR - price) * rateBasisPoints;
  return numerator / (10_000 * ONE_DOLLAR);
}
