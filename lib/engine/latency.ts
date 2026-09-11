import type { MatchEvent, Matcher, OrderRequest } from "./match";

export interface LatencyConfig {
  /** Ticks between submitting an order and it reaching the book. */
  submitTicks: number;
  /** Ticks between requesting a cancel and it taking effect. */
  cancelTicks: number;
  /** How many ticks stale the book the player sees is. */
  marketDataTicks: number;
}

export const NO_LATENCY: LatencyConfig = { submitTicks: 0, cancelTicks: 0, marketDataTicks: 0 };

type Pending =
  | { dueTick: number; kind: "submit"; order: OrderRequest }
  | { dueTick: number; kind: "cancel"; id: string };

/**
 * Delays the player's orders by a fixed number of ticks.
 *
 * This is what lets a scenario be built where a faster agent wins the race (Ch 9/11):
 * the player sees an opportunity, sends an order, and it arrives too late.
 */
export class LatencyQueue {
  private pending: Pending[] = [];

  constructor(
    private readonly matcher: Matcher,
    private readonly config: LatencyConfig,
  ) {}

  submit(order: OrderRequest, now: number): void {
    this.pending.push({ dueTick: now + this.config.submitTicks, kind: "submit", order });
  }

  cancel(id: string, now: number): void {
    this.pending.push({ dueTick: now + this.config.cancelTicks, kind: "cancel", id });
  }

  /** Releases everything due at or before `now`, in submission order. */
  release(now: number): MatchEvent[] {
    const due = this.pending.filter((p) => p.dueTick <= now);
    this.pending = this.pending.filter((p) => p.dueTick > now);

    const events: MatchEvent[] = [];
    for (const p of due) {
      if (p.kind === "submit") events.push(...this.matcher.submit(p.order).events);
      else events.push(this.matcher.cancel(p.id));
    }
    return events;
  }

  get inFlight(): number {
    return this.pending.length;
  }
}

/** Contracts resting ahead of the player's order at its own price. */
export function queuePosition(matcher: Matcher, orderId: string): number | undefined {
  return matcher.book.get(orderId) === undefined ? undefined : matcher.book.aheadOf(orderId);
}
