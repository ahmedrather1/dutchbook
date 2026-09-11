import { cents, ONE_DOLLAR, type Cents, type Ticks } from "./money";

/**
 * Position, cash, and P&L for one binary market. All integer arithmetic (D20).
 *
 * Cost basis is kept as an exact signed total rather than an average, because an
 * average has to be rounded and the rounding error then shows up in the P&L identity.
 * Average cost is derived for display only.
 *
 * A negative position is a short: at resolution it costs up to $1 each, so that
 * obligation is held aside as locked collateral and cannot be spent.
 */
export class Portfolio {
  private qty = 0;
  private basis = 0;
  private cashCents: number;
  private realisedCents = 0;

  constructor(readonly startingCash: Cents) {
    this.cashCents = startingCash;
  }

  get position(): number {
    return this.qty;
  }

  get averageCost(): Ticks {
    return (this.qty === 0 ? 0 : Math.round(this.basis / this.qty)) as Ticks;
  }

  get cash(): Cents {
    return cents(this.cashCents);
  }

  get realised(): Cents {
    return cents(this.realisedCents);
  }

  /** Collateral a short position must reserve: $1 per contract. */
  get lockedCapital(): Cents {
    return cents(Math.max(0, -this.qty) * ONE_DOLLAR);
  }

  get buyingPower(): Cents {
    return cents(this.cashCents - this.lockedCapital);
  }

  unrealised(mark: Ticks): Cents {
    return cents(this.qty * mark - this.basis);
  }

  /** Cash plus the market value of the position. */
  equity(mark: Ticks): Cents {
    return cents(this.cashCents + this.qty * mark);
  }

  apply(side: "buy" | "sell", price: Ticks, qty: number): void {
    if (!Number.isInteger(qty) || qty <= 0) throw new RangeError(`bad fill qty: ${qty}`);
    const signed = side === "buy" ? qty : -qty;
    this.cashCents -= signed * price;

    const closing = Math.min(qty, Math.max(0, -Math.sign(signed) * this.qty));
    if (closing > 0) {
      const removed = Math.round((this.basis * closing) / Math.abs(this.qty));
      this.realisedCents += -Math.sign(signed) * closing * price - removed;
      this.basis -= removed;
    }

    const opening = qty - closing;
    if (opening > 0) this.basis += Math.sign(signed) * opening * price;

    this.qty += signed;
    if (this.qty === 0) this.basis = 0;
  }

  /** Market resolves: every contract becomes $1 or $0, and the position closes out. */
  settle(outcome: "yes" | "no"): void {
    if (this.qty === 0) return;
    const value = (outcome === "yes" ? ONE_DOLLAR : 0) as Ticks;
    this.apply(this.qty > 0 ? "sell" : "buy", value, Math.abs(this.qty));
  }
}
