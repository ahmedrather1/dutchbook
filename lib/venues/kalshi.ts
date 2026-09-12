import { cents, type Cents } from "@/lib/engine/money";
import { rawFeeUnits, type FeeInput, type Venue } from "./venue";

/**
 * Kalshi.
 *
 * Fee: 0.07 × C × P × (1 − P), rounded UP, applied per order across all fills.
 * Source: https://docs.kalshi.com/getting_started/fee_rounding (checked 2026-09-12)
 * See docs/venues.md for the worked examples these tests reproduce.
 */
export const KALSHI_FEE_RATE = 0.07;
const RATE_BP = 700;

/** Tick size is UNVERIFIED in the docs (Q5); 1¢ is the conventional value. */
const TICK_SIZE = 10;

export const kalshi: Venue = {
  id: "kalshi",
  name: "Kalshi",
  tickSize: TICK_SIZE,
  currency: "USD",
  makerPaysFee: true,
  supportsMerge: false,
  supportsNegativeRisk: false,
  sourceNote: "docs/venues.md, checked 2026-09-12",

  fee({ qty, price }: FeeInput): Cents {
    // Rounded up to the next whole cent, which is 10 of our sub-cent units. The epsilon
    // stops a value that is exactly a cent from being pushed to the next one by
    // floating-point noise in the final divide.
    const raw = rawFeeUnits(qty, price, RATE_BP);
    return cents(Math.ceil(raw / 10 - 1e-9) * 10);
  },
};
