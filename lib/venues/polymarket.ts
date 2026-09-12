import { cents, type Cents } from "@/lib/engine/money";
import { rawFeeUnits, type FeeInput, type Venue } from "./venue";

/**
 * Polymarket.
 *
 * Fee: C × feeRate × p × (1 − p), takers only; makers are never charged.
 * Source: https://docs.polymarket.com/trading/fees (checked 2026-09-12)
 *
 * NOTE: a secondary source gives a different form with an extra p and an exponent.
 * The official docs form is used here; the conflict is recorded as Q5 in QUESTIONS.md
 * and in docs/venues.md. If the other form is current, only `fee` below changes.
 */
export const POLYMARKET_FEE_RATES = {
  crypto: 0.07,
  sports: 0.05,
  economics: 0.05,
  culture: 0.05,
  weather: 0.05,
  finance: 0.04,
  politics: 0.04,
  tech: 0.04,
  geopolitics: 0,
} as const;

export type PolymarketCategory = keyof typeof POLYMARKET_FEE_RATES;

/**
 * Real tick is 0.25¢ on decimalized markets (Polymarket changelog, checked 2026-09-12).
 * Our price unit is 1/1000 of a dollar, so 0.25¢ is 2.5 units — not an integer, and
 * integer prices are non-negotiable (D20). We model 0.5¢ instead: still finer than
 * Kalshi's cent, which is the difference Chapter 7 actually needs. Recorded as Q10.
 */
const TICK_SIZE = 5;

export function makePolymarket(category: PolymarketCategory = "politics"): Venue {
  const feeRate = POLYMARKET_FEE_RATES[category];

  return {
    id: "polymarket",
    name: "Polymarket",
    tickSize: TICK_SIZE,
    currency: "USDC",
    makerPaysFee: false,
    supportsMerge: true,
    supportsNegativeRisk: true,
    sourceNote: `docs/venues.md, ${category} rate ${feeRate}, checked 2026-09-12`,

    fee({ qty, price, role }: FeeInput): Cents {
      if (role === "maker") return cents(0);
      // Docs round to 5 decimal places of a dollar, finer than our unit; round to the
      // nearest cash unit instead.
      return cents(Math.round(rawFeeUnits(qty, price, feeRate * 10_000)));
    },
  };
}

export const polymarket = makePolymarket("politics");
