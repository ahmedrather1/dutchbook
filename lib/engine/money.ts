/**
 * Money and prices are integers in the venue's minimum tick (D20).
 * A binary contract settles at $0 or $1, so price lives in [0, ONE_DOLLAR].
 */

export type Ticks = number & { readonly __brand: "Ticks" };
export type Cents = number & { readonly __brand: "Cents" };

/** Sub-cent resolution: 1000 units = $1.00, so a Kalshi 1¢ tick is 10 units. */
export const ONE_DOLLAR = 1000;

export function ticks(n: number): Ticks {
  if (!Number.isInteger(n)) throw new RangeError(`ticks must be an integer: ${n}`);
  if (n < 0 || n > ONE_DOLLAR) throw new RangeError(`price out of [0,${ONE_DOLLAR}]: ${n}`);
  return n as Ticks;
}

export function cents(n: number): Cents {
  if (!Number.isInteger(n)) throw new RangeError(`cents must be an integer: ${n}`);
  if (!Number.isSafeInteger(n)) throw new RangeError(`cents overflow: ${n}`);
  return n as Cents;
}

/** Cost of `qty` contracts at `price`. Exact: both operands are integers. */
export function notional(price: Ticks, qty: number): Cents {
  if (!Number.isInteger(qty) || qty < 0) throw new RangeError(`qty must be a non-negative integer: ${qty}`);
  return cents(price * qty);
}

export function addCents(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subCents(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

/** The complement price: YES + NO = $1 (D8 ch4). */
export function complement(price: Ticks): Ticks {
  return ticks(ONE_DOLLAR - price);
}

/** Round to a venue's tick size, e.g. 10 for Kalshi's 1¢. Half-up. */
export function roundToTick(price: number, tickSize: number): Ticks {
  if (tickSize < 1 || !Number.isInteger(tickSize)) throw new RangeError(`bad tickSize: ${tickSize}`);
  return ticks(Math.round(price / tickSize) * tickSize);
}

export function onTick(price: Ticks, tickSize: number): boolean {
  return price % tickSize === 0;
}

/** Display boundary only (D20). */
export function formatPrice(price: Ticks): string {
  return `$${(price / ONE_DOLLAR).toFixed(price % 10 === 0 ? 2 : 3)}`;
}

export function formatCents(v: Cents): string {
  const sign = v < 0 ? "-" : "";
  return `${sign}$${(Math.abs(v) / ONE_DOLLAR).toFixed(2)}`;
}

export function formatProbability(price: Ticks): string {
  return `${(price / ONE_DOLLAR * 100).toFixed(1)}%`;
}
