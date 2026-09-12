import { OrderBook } from "@/lib/engine/book";
import { Matcher, type MatchEvent } from "@/lib/engine/match";
import { Portfolio } from "@/lib/engine/portfolio";
import { makeRng } from "@/lib/engine/rng";
import { PLAYER, type Scenario } from "@/lib/engine/sim";
import type { Action, Strategy, StrategyContext } from "./api";

export interface RunOutcome {
  scenarioId: string;
  finalPosition: number;
  realised: number;
  /** Equity minus starting cash, marked at the final mid. */
  netPnl: number;
  /** Worst equity dip below the starting bankroll, as a positive number. */
  maxDrawdown: number;
  trades: number;
  /** Ended holding a position the strategy never closed. */
  strandedPosition: number;
  logs: string[];
  error?: string;
}

const MAX_ACTIONS_PER_TICK = 4;
const MAX_LOGS = 200;

/**
 * Runs a strategy function against a scenario, deterministically (D18).
 *
 * Pure TypeScript: the same runner drives the browser sandbox and the scoring harness,
 * and unit tests call it directly with an ordinary function.
 */
/**
 * One run in progress. Shared by the synchronous runner (tests, scoring) and the
 * asynchronous one (browser sandbox), so the two can never drift apart.
 */
class Run {
  private readonly rng: ReturnType<typeof makeRng>;
  readonly book = new OrderBook();
  readonly matcher: Matcher;
  private readonly portfolio: Portfolio;
  private readonly agents: ReturnType<Scenario["agents"]>;
  private recentFills: MatchEvent[] = [];

  readonly logs: string[] = [];
  memory: Record<string, unknown> = {};
  trades = 0;
  maxDrawdown = 0;
  error: string | undefined;

  constructor(readonly scenario: Scenario) {
    this.rng = makeRng(scenario.seed);
    this.matcher = new Matcher(this.book, scenario.tickSize);
    this.portfolio = new Portfolio(scenario.startingCash);
    this.agents = scenario.agents();
    for (const level of scenario.initialBook) {
      this.matcher.seed(level.side, level.price, level.qty);
    }
    this.matcher.takeEvents();
  }

  /** Advances the market to `tick`, before the strategy is consulted. */
  openTick(tick: number): void {
    const fairValue = this.scenario.fairValue(tick);
    const ctx = {
      tick,
      fairValue,
      matcher: this.matcher,
      rng: this.rng,
      tickSize: this.scenario.tickSize,
      recentFills: this.recentFills,
    };
    for (const agent of this.agents) agent.act(ctx);
    applyFills(this.matcher.takeEvents(), this.portfolio);
  }

  context(tick: number): StrategyContext {
    return buildContext(
      tick,
      this.scenario,
      this.book,
      this.portfolio,
      this.memory,
      this.logs,
      this.restingOrders().map((o) => ({ side: o.side, price: o.price as number, qty: o.qty })),
    );
  }

  submit(actions: Action | Action[] | void, tick: number): void {
    for (const action of normalise(actions)) {
      if (action.type === "hold") continue;

      if (action.type === "cancel") {
        for (const order of this.restingOrders()) this.matcher.cancel(order.id);
        continue;
      }

      if (!Number.isInteger(action.qty) || action.qty <= 0) continue;
      const limit = action.price;
      if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0 || limit >= 1000)) continue;

      this.matcher.submit({
        id: `${PLAYER}-${tick}-${this.trades}`,
        side: action.type,
        type: limit === undefined ? "market" : "limit",
        price: limit === undefined ? undefined : (limit as never),
        qty: action.qty,
        owner: PLAYER,
      });
      this.trades += 1;
    }
  }

  restingOrders() {
    return [...this.book.queue("buy"), ...this.book.queue("sell")].filter(
      (o) => o.owner === PLAYER,
    );
  }

  /** Settles fills and records drawdown, after the strategy has acted. */
  closeTick(tick: number): void {
    this.recentFills = applyFills(this.matcher.takeEvents(), this.portfolio);
    const mark = mid(this.book) ?? this.scenario.fairValue(tick);
    const dip = this.scenario.startingCash - this.portfolio.equity(mark);
    if (dip > this.maxDrawdown) this.maxDrawdown = dip;
  }

  finish(): RunOutcome {
    if (this.scenario.resolution) this.portfolio.settle(this.scenario.resolution.outcome);
    const finalMark = mid(this.book) ?? this.scenario.fairValue(this.scenario.durationTicks);
    return {
      scenarioId: this.scenario.id,
      finalPosition: this.portfolio.position,
      realised: this.portfolio.realised,
      netPnl: this.portfolio.equity(finalMark) - this.scenario.startingCash,
      maxDrawdown: this.maxDrawdown,
      trades: this.trades,
      strandedPosition: Math.abs(this.portfolio.position),
      logs: this.logs,
      error: this.error,
    };
  }
}

export function runStrategy(scenario: Scenario, strategy: Strategy): RunOutcome {
  const run = new Run(scenario);

  for (let tick = 1; tick <= scenario.durationTicks; tick++) {
    run.openTick(tick);
    if (!run.error) {
      try {
        run.submit(strategy(run.context(tick)), tick);
      } catch (thrown) {
        run.error = thrown instanceof Error ? thrown.message : String(thrown);
      }
    }
    run.closeTick(tick);
  }

  return run.finish();
}

/** Drives a run through the Web Worker sandbox, one tick at a time (D28). */
export async function runStrategyInSandbox(
  scenario: Scenario,
  tick: (ctx: Omit<StrategyContext, "log">) => Promise<{
    actions: Action | Action[] | null;
    logs: string[];
    memory: Record<string, unknown>;
    error?: string;
  }>,
): Promise<RunOutcome> {
  const run = new Run(scenario);

  for (let t = 1; t <= scenario.durationTicks; t++) {
    run.openTick(t);

    if (!run.error) {
      // `log` is a function and cannot cross the worker boundary; the worker supplies
      // its own and returns what was logged.
      const full = run.context(t);
      const result = await tick({
        tick: full.tick,
        ticksRemaining: full.ticksRemaining,
        market: full.market,
        account: full.account,
        memory: run.memory,
      });
      run.logs.push(...result.logs.slice(0, Math.max(0, 200 - run.logs.length)));
      run.memory = result.memory ?? run.memory;
      if (result.error) run.error = result.error;
      else run.submit(result.actions ?? undefined, t);
    }

    run.closeTick(t);
  }

  return run.finish();
}

function buildContext(
  tick: number,
  scenario: Scenario,
  book: OrderBook,
  portfolio: Portfolio,
  memory: Record<string, unknown>,
  logs: string[],
  resting: { side: "buy" | "sell"; price: number; qty: number }[] = [],
): StrategyContext {
  const bestBid = book.bestBid();
  const bestAsk = book.bestAsk();
  return {
    tick,
    ticksRemaining: scenario.durationTicks - tick,
    market: {
      bestBid,
      bestAsk,
      bids: book.levels("buy", 8).map((l) => ({ price: l.price, qty: l.qty })),
      asks: book.levels("sell", 8).map((l) => ({ price: l.price, qty: l.qty })),
      spread: bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : undefined,
    },
    account: {
      resting,
      position: portfolio.position,
      cash: portfolio.cash,
      realised: portfolio.realised,
      locked: portfolio.lockedCapital,
    },
    memory,
    log: (...args) => {
      if (logs.length < MAX_LOGS) logs.push(args.map(String).join(" "));
    },
  };
}

function normalise(actions: Action | Action[] | void): Action[] {
  if (!actions) return [];
  return (Array.isArray(actions) ? actions : [actions]).slice(0, MAX_ACTIONS_PER_TICK);
}

function applyFills(events: MatchEvent[], portfolio: Portfolio): MatchEvent[] {
  for (const event of events) {
    if (event.kind !== "fill") continue;
    if (event.takerOwner === PLAYER) portfolio.apply(event.takerSide, event.price, event.qty);
    else if (event.makerOwner === PLAYER) {
      portfolio.apply(event.takerSide === "buy" ? "sell" : "buy", event.price, event.qty);
    }
  }
  return events.filter((e) => e.kind === "fill");
}

function mid(book: OrderBook) {
  const bid = book.bestBid();
  const ask = book.bestAsk();
  return bid === undefined || ask === undefined ? undefined : (Math.round((bid + ask) / 2) as never);
}
