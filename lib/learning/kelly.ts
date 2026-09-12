/**
 * Kelly sizing for a binary contract.
 *
 * Buying at price p something you believe is worth q: you risk p to win (1 − p).
 * Kelly fraction = (q − p) / (1 − p), the edge divided by the odds received.
 */
export function kellyFraction(belief: number, price: number): number {
  if (price <= 0 || price >= 1) throw new RangeError(`price must be in (0,1): ${price}`);
  if (belief < 0 || belief > 1) throw new RangeError(`belief must be in [0,1]: ${belief}`);
  const edge = belief - price;
  return edge <= 0 ? 0 : edge / (1 - price);
}

/** What practitioners actually bet: a fraction of full Kelly, because the edge is a guess. */
export function fractionalKelly(belief: number, price: number, fraction = 0.25): number {
  return kellyFraction(belief, price) * fraction;
}

/**
 * Probability of ever falling to `ruinFraction` of your bankroll while betting a fixed
 * fraction. Approximated by simulation-free bounds; used only to make the shape visible.
 */
export function overbetPenalty(kelly: number, betFraction: number): number {
  if (kelly <= 0) return 1;
  const ratio = betFraction / kelly;
  // Growth rate relative to optimal: 2r - r^2, which is negative beyond twice Kelly.
  return 2 * ratio - ratio * ratio;
}
