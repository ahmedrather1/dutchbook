import type { Side } from "./book";
import type { MatchEvent, Matcher } from "./match";
import { roundToTick, ticks, type Ticks, ONE_DOLLAR } from "./money";
import { makeRng, type Rng } from "./rng";

/** What the market "really" thinks, in ticks. Scenarios script this to guarantee a lesson. */
export type FairValuePath = (tick: number) => Ticks;

export interface AgentContext {
  tick: number;
  fairValue: Ticks;
  matcher: Matcher;
  rng: Rng;
  tickSize: number;
  /** Fills produced since this agent last acted, so it can react to being taken. */
  recentFills: readonly MatchEvent[];
}

export interface Agent {
  readonly id: string;
  act(ctx: AgentContext): void;
}

export interface MarketMakerConfig {
  id: string;
  /** Half-spread in ticks at rest. */
  halfSpread: number;
  size: number;
  /** Requote every N ticks. */
  refreshEvery: number;
  /** Ticks added to the half-spread per fill taken, decaying back to rest. */
  widenPerFill?: number;
  maxHalfSpread?: number;
}

/**
 * Quotes both sides around fair value and widens after being run over — which is what
 * makes an arb window close if the player is slow (Ch 6/9).
 */
export function makeMarketMaker(cfg: MarketMakerConfig): Agent {
  const widenPerFill = cfg.widenPerFill ?? 0;
  const maxHalfSpread = cfg.maxHalfSpread ?? cfg.halfSpread * 4;
  let extra = 0;
  let seq = 0;
  const quoted: string[] = [];

  return {
    id: cfg.id,
    act(ctx) {
      const takenFromMe = ctx.recentFills.filter(
        (e) => e.kind === "fill" && quoted.includes(e.makerId),
      ).length;
      extra = Math.min(maxHalfSpread - cfg.halfSpread, extra + takenFromMe * widenPerFill);
      if (takenFromMe === 0) extra = Math.max(0, extra - 1);

      if (ctx.tick % cfg.refreshEvery !== 0) return;

      for (const id of quoted.splice(0)) ctx.matcher.cancel(id);

      const half = cfg.halfSpread + extra;
      const bid = clamp(ctx.fairValue - half, ctx.tickSize);
      const ask = clamp(ctx.fairValue + half, ctx.tickSize);
      if (bid >= ask) return;

      // Submitted, not seeded: a requote after a large move must trade against the
      // stale orders it crosses, exactly as it would on a real venue. Seeding would
      // insert straight into the book and leave it crossed.
      for (const [side, price] of [
        ["buy", bid],
        ["sell", ask],
      ] as const) {
        const id = `${cfg.id}-q${++seq}`;
        ctx.matcher.submit({ id, side, type: "limit", price, qty: cfg.size, owner: cfg.id });
        if (ctx.matcher.book.get(id)) quoted.push(id);
      }
    },
  };
}

export interface TakerConfig {
  id: string;
  /** Probability of trading on any given tick. */
  frequency: number;
  minSize: number;
  maxSize: number;
}

/** Trades in a random direction. Provides the churn that makes a book feel alive. */
export function makeNoiseTaker(cfg: TakerConfig): Agent {
  let n = 0;
  return {
    id: cfg.id,
    act(ctx) {
      if (!ctx.rng.bool(cfg.frequency)) return;
      const side: Side = ctx.rng.bool(0.5) ? "buy" : "sell";
      ctx.matcher.submit({
        id: `${cfg.id}-${++n}`,
        side,
        type: "market",
        qty: ctx.rng.int(cfg.minSize, cfg.maxSize),
        owner: cfg.id,
      });
    },
  };
}

export interface InformedConfig extends TakerConfig {
  /** Only trade when the book is at least this many ticks away from fair value. */
  edgeThreshold: number;
}

/**
 * Trades toward fair value whenever the book drifts far enough from it. This is the
 * agent that punishes a player for leaving a stale quote resting (Ch 9).
 */
export function makeInformedTrader(cfg: InformedConfig): Agent {
  let n = 0;
  return {
    id: cfg.id,
    act(ctx) {
      if (!ctx.rng.bool(cfg.frequency)) return;

      const bestAsk = ctx.matcher.book.bestAsk();
      const bestBid = ctx.matcher.book.bestBid();
      let side: Side | undefined;
      if (bestAsk !== undefined && ctx.fairValue - bestAsk >= cfg.edgeThreshold) side = "buy";
      else if (bestBid !== undefined && bestBid - ctx.fairValue >= cfg.edgeThreshold) side = "sell";
      if (!side) return;

      ctx.matcher.submit({
        id: `${cfg.id}-${++n}`,
        side,
        type: "market",
        qty: ctx.rng.int(cfg.minSize, cfg.maxSize),
        owner: cfg.id,
      });
    },
  };
}

export interface ClumsyConfig {
  id: string;
  /** Post a mispriced order every N ticks. */
  everyTicks: number;
  size: number;
  /** How far inside fair value the order is priced, in ticks. */
  giveaway: number;
  /** Which side is given away. "both" alternates. */
  side?: "buy" | "sell" | "both";
}

/**
 * A participant who leaves orders priced worse than fair value — retail flow, a stale
 * algorithm, someone who needs out. This is the edge a scanner is supposed to find, and
 * without someone like it a market with a competent maker offers a taker nothing.
 */
export function makeClumsyTrader(cfg: ClumsyConfig): Agent {
  let seq = 0;
  return {
    id: cfg.id,
    act(ctx) {
      if (ctx.tick % cfg.everyTicks !== 0) return;

      const mode = cfg.side ?? "both";
      const sells = mode === "sell" || (mode === "both" && seq % 2 === 0);
      const side: Side = sells ? "sell" : "buy";
      // A cheap offer sits below fair value; a generous bid sits above it.
      const price = clamp(
        sells ? ctx.fairValue - cfg.giveaway : ctx.fairValue + cfg.giveaway,
        ctx.tickSize,
      );

      ctx.matcher.submit({
        id: `${cfg.id}-${++seq}`,
        side,
        type: "limit",
        price,
        qty: cfg.size,
        owner: cfg.id,
      });
    },
  };
}

function clamp(price: number, tickSize: number): Ticks {
  return roundToTick(Math.max(tickSize, Math.min(ONE_DOLLAR - tickSize, price)), tickSize);
}

/** A constant fair value, for scenarios that only need a still market. */
export function flat(price: number): FairValuePath {
  const p = ticks(price);
  return () => p;
}

/** Linear move from `from` to `to` between two ticks, flat outside that window. */
export function ramp(from: number, to: number, startTick: number, endTick: number): FairValuePath {
  return (t) => {
    if (t <= startTick) return ticks(from);
    if (t >= endTick) return ticks(to);
    const progress = (t - startTick) / (endTick - startTick);
    return ticks(Math.round(from + (to - from) * progress));
  };
}

/**
 * A gentle random walk. Precomputed from a seed so the path is fixed for a scenario
 * and the run still replays exactly (D18).
 */
export function wander(start: number, stepTicks: number, seed: number, length = 400): FairValuePath {
  const rng = makeRng(seed);
  const path: Ticks[] = [];
  let p = start;
  for (let i = 0; i <= length; i++) {
    p = Math.max(50, Math.min(ONE_DOLLAR - 50, p + rng.int(-stepTicks, stepTicks)));
    path.push(roundToTick(p, 10));
  }
  return (t) => path[Math.min(t, length)]!;
}

/** An instantaneous repricing at `atTick` — a news event (Ch 9). */
export function jump(before: number, after: number, atTick: number): FairValuePath {
  return (t) => (t < atTick ? ticks(before) : ticks(after));
}
