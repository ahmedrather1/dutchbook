import { cents, complement, ONE_DOLLAR, type Cents, type Ticks } from "@/lib/engine/money";
import type { Venue } from "./venue";

/**
 * YES + NO = $1 (docs/venues.md, both venues).
 *
 * Split turns $1 of collateral into one of each; merge turns the pair back into $1.
 * Merge is what lets a Dutch book be realised immediately instead of waiting months for
 * resolution — the mechanical core of Chapter 6.
 */

export interface Pair {
  yes: number;
  no: number;
}

/** Buying NO at price p is the same exposure as selling YES at $1 − p. */
export function noAsYes(noPrice: Ticks): Ticks {
  return complement(noPrice);
}

/** $1 of collateral becomes one YES and one NO. */
export function split(collateral: Cents): { pair: Pair; spent: Cents } {
  const units = Math.floor(collateral / ONE_DOLLAR);
  return { pair: { yes: units, no: units }, spent: cents(units * ONE_DOLLAR) };
}

/** Each YES+NO pair becomes $1 back. Returns what is left over. */
export function merge(pair: Pair): { proceeds: Cents; remaining: Pair } {
  const pairs = Math.min(pair.yes, pair.no);
  return {
    proceeds: cents(pairs * ONE_DOLLAR),
    remaining: { yes: pair.yes - pairs, no: pair.no - pairs },
  };
}

export interface DutchBook {
  /** Cost of one YES plus one NO. Below $1 means a locked profit. */
  combined: Cents;
  /** Profit per pair before costs. Negative when there is no arb. */
  grossPerPair: Cents;
  /** Profit per pair after both legs' fees. This is the number that matters. */
  netPerPair: Cents;
  /** Pairs available, limited by the thinner side. */
  maxPairs: number;
  exists: boolean;
}

/**
 * The Chapter 6 calculation: buy YES and NO for a combined total under $1, merge, and
 * keep the difference whatever happens.
 */
export function findDutchBook(
  venue: Venue,
  yesAsk: Ticks,
  yesDepth: number,
  noAsk: Ticks,
  noDepth: number,
): DutchBook {
  const combined = cents(yesAsk + noAsk);
  const grossPerPair = cents(ONE_DOLLAR - combined);
  const maxPairs = Math.min(yesDepth, noDepth);

  const fees =
    venue.fee({ qty: 1, price: yesAsk, role: "taker" }) +
    venue.fee({ qty: 1, price: noAsk, role: "taker" });
  const netPerPair = cents(grossPerPair - fees);

  return {
    combined,
    grossPerPair,
    netPerPair,
    maxPairs,
    exists: netPerPair > 0 && maxPairs > 0,
  };
}

export interface OutcomeQuote {
  label: string;
  ask: Ticks;
  depth: number;
}

export interface MultiOutcomeArb {
  /** Sum of the best ask across every outcome. Below $1 means an arb. */
  total: Cents;
  grossPerSet: Cents;
  netPerSet: Cents;
  maxSets: number;
  exists: boolean;
}

/**
 * Chapter 8: in a winner-take-all set, exactly one outcome pays $1. Buying every outcome
 * for a combined total under $1 is a guaranteed profit.
 */
export function findMultiOutcomeArb(venue: Venue, outcomes: readonly OutcomeQuote[]): MultiOutcomeArb {
  const total = cents(outcomes.reduce((sum, o) => sum + o.ask, 0));
  const grossPerSet = cents(ONE_DOLLAR - total);
  const fees = outcomes.reduce(
    (sum, o) => sum + venue.fee({ qty: 1, price: o.ask, role: "taker" }),
    0,
  );
  const netPerSet = cents(grossPerSet - fees);
  const maxSets = outcomes.length === 0 ? 0 : Math.min(...outcomes.map((o) => o.depth));

  return { total, grossPerSet, netPerSet, maxSets, exists: netPerSet > 0 && maxSets > 0 };
}

/**
 * Negative risk: 1 NO on any outcome converts to 1 YES on every other outcome
 * (docs/venues.md, checked 2026-09-12).
 */
export function convertNegativeRisk(outcomeCount: number, noShares: number): number {
  if (outcomeCount < 2) throw new RangeError("negative risk needs at least two outcomes");
  return noShares * (outcomeCount - 1);
}
