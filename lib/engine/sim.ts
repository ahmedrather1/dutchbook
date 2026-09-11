import type { Agent, FairValuePath } from "./agents";
import { OrderBook, type Side } from "./book";
import { Clock } from "./clock";
import { Matcher, type MatchEvent, type OrderRequest } from "./match";
import type { Cents, Ticks } from "./money";
import { Portfolio } from "./portfolio";
import { makeRng } from "./rng";

export const PLAYER = "player";

export interface Scenario {
  id: string;
  seed: number;
  tickSize: number;
  durationTicks: number;
  startingCash: Cents;
  initialBook: { side: Side; price: Ticks; qty: number }[];
  fairValue: FairValuePath;
  /** A factory, so each run starts with fresh agent state (D18). */
  agents: () => Agent[];
  resolution?: { atTick: number; outcome: "yes" | "no" };
}

export type PlayerAction =
  | { atTick: number; kind: "submit"; order: Omit<OrderRequest, "owner"> }
  | { atTick: number; kind: "cancel"; id: string };

export interface LoggedEvent {
  tick: number;
  event: MatchEvent | { kind: "resolved"; outcome: "yes" | "no" };
}

export interface RunResult {
  scenarioId: string;
  seed: number;
  events: LoggedEvent[];
  book: OrderBook;
  portfolio: Portfolio;
  finalMark: Ticks;
  /** Canonical serialisation — two identical runs produce identical strings (D18). */
  log: string;
}

export function runScenario(scenario: Scenario, actions: readonly PlayerAction[] = []): RunResult {
  const rng = makeRng(scenario.seed);
  const book = new OrderBook();
  const matcher = new Matcher(book, scenario.tickSize);
  const clock = new Clock();
  const portfolio = new Portfolio(scenario.startingCash);
  const agents = scenario.agents();
  const events: LoggedEvent[] = [];

  for (const level of scenario.initialBook) matcher.seed(level.side, level.price, level.qty);

  const byTick = new Map<number, PlayerAction[]>();
  for (const a of actions) {
    const list = byTick.get(a.atTick) ?? [];
    list.push(a);
    byTick.set(a.atTick, list);
  }

  matcher.takeEvents(); // discard setup noise from seeding the initial book

  let recentFills: MatchEvent[] = [];

  for (let t = 1; t <= scenario.durationTicks; t++) {
    clock.advance();

    for (const action of byTick.get(t) ?? []) {
      if (action.kind === "submit") matcher.submit({ ...action.order, owner: PLAYER });
      else matcher.cancel(action.id);
    }

    const fairValue = scenario.fairValue(t);
    const ctx = { tick: t, fairValue, matcher, rng, tickSize: scenario.tickSize, recentFills };
    for (const agent of agents) agent.act(ctx);

    const tickEvents = matcher.takeEvents();
    for (const event of tickEvents) {
      events.push({ tick: t, event });
      if (event.kind === "fill") {
        if (event.takerOwner === PLAYER) portfolio.apply(event.takerSide, event.price, event.qty);
        else if (event.makerOwner === PLAYER) {
          // As the maker you take the other side of the taker's trade.
          portfolio.apply(event.takerSide === "buy" ? "sell" : "buy", event.price, event.qty);
        }
      }
    }
    recentFills = tickEvents.filter((e) => e.kind === "fill");

    if (scenario.resolution?.atTick === t) {
      portfolio.settle(scenario.resolution.outcome);
      events.push({ tick: t, event: { kind: "resolved", outcome: scenario.resolution.outcome } });
    }
  }

  const mark = midOrLast(book, scenario.fairValue(scenario.durationTicks));
  return {
    scenarioId: scenario.id,
    seed: scenario.seed,
    events,
    book,
    portfolio,
    finalMark: mark,
    log: serialise(events),
  };
}

export function serialise(events: readonly LoggedEvent[]): string {
  return events
    .map(({ tick, event }) => {
      const parts = Object.entries(event)
        .filter(([k]) => k !== "kind")
        .map(([k, v]) => `${k}=${String(v)}`);
      return [tick, event.kind, ...parts].join("|");
    })
    .join("\n");
}

function midOrLast(book: OrderBook, fallback: Ticks): Ticks {
  const bid = book.bestBid();
  const ask = book.bestAsk();
  if (bid === undefined || ask === undefined) return fallback;
  return Math.round((bid + ask) / 2) as Ticks;
}
