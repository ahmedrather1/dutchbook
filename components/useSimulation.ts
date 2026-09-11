"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "@/lib/engine/clock";
import { OrderBook } from "@/lib/engine/book";
import { estimateFill, Matcher } from "@/lib/engine/match";
import { Portfolio } from "@/lib/engine/portfolio";
import { makeRng } from "@/lib/engine/rng";
import { PLAYER, type Scenario } from "@/lib/engine/sim";
import type { FillEstimate, MatchEvent } from "@/lib/engine/match";
import type { Side } from "@/lib/engine/book";
import { toTrades, type Trade } from "./Tape";

interface World {
  book: OrderBook;
  matcher: Matcher;
  clock: Clock;
  rng: ReturnType<typeof makeRng>;
  portfolio: Portfolio;
  agents: ReturnType<Scenario["agents"]>;
  recentFills: MatchEvent[];
}

export interface SimState {
  tick: number;
  bids: ReturnType<OrderBook["levels"]>;
  asks: ReturnType<OrderBook["levels"]>;
  position: number;
  cash: number;
  realised: number;
  running: boolean;
  trades: Trade[];
  /** Ticks remaining before the scenario ends. */
  remaining: number;
}

/**
 * Drives a scenario from a frame loop. The engine itself stays framework-free (D19);
 * this hook only advances the clock and copies state out for rendering.
 */
export function useSimulation(scenario: Scenario) {
  const world = useMemo<World>(() => {
    const book = new OrderBook();
    const matcher = new Matcher(book, scenario.tickSize);
    for (const l of scenario.initialBook) matcher.seed(l.side, l.price, l.qty);
    matcher.takeEvents();
    return {
      book,
      matcher,
      clock: new Clock(),
      rng: makeRng(scenario.seed),
      portfolio: new Portfolio(scenario.startingCash),
      agents: scenario.agents(),
      recentFills: [],
    };
  }, [scenario]);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [state, setState] = useState<SimState>(() => snapshot(world, scenario, false, []));
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    let stopped = false;

    const step = (now: number) => {
      const newTrades: Trade[] = [];
      const before = world.clock.tick;
      world.clock.advanceByWallMs(now - last);
      last = now;

      for (let t = before + 1; t <= world.clock.tick; t++) {
        if (t > scenario.durationTicks) {
          stopped = true;
          setRunning(false);
          break;
        }
        newTrades.unshift(...advanceOneTick(world, scenario, t));
      }

      if (newTrades.length > 0) setTrades((prev) => [...newTrades, ...prev].slice(0, 60));
      setState(snapshot(world, scenario, !stopped, newTrades));
      if (!stopped) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [running, world, scenario]);

  const trade = (side: Side, qty: number) => {
    world.matcher.submit({
      id: `${PLAYER}-${world.clock.tick}-${side}-${qty}-${Math.trunc(world.portfolio.cash)}`,
      side,
      type: "market",
      qty,
      owner: PLAYER,
    });
    const fills = toTrades(applyFills(world), world.clock.tick);
    setTrades((prev) => [...fills, ...prev].slice(0, 60));
    setState(snapshot(world, scenario, running, fills));
  };

  const estimate = (side: Side, qty: number): FillEstimate =>
    estimateFill(world.book, side, qty);

  return {
    state: { ...state, trades },
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    trade,
    estimate,
  };
}

function advanceOneTick(world: World, scenario: Scenario, t: number): Trade[] {
  const fairValue = scenario.fairValue(t);
  const ctx = {
    tick: t,
    fairValue,
    matcher: world.matcher,
    rng: world.rng,
    tickSize: scenario.tickSize,
    recentFills: world.recentFills,
  };
  for (const agent of world.agents) agent.act(ctx);
  const fills = applyFills(world);
  world.recentFills = fills;
  return toTrades(fills, t);
}

/** Drains matcher events and books any of the player's fills into the portfolio. */
function applyFills(world: World): MatchEvent[] {
  const events = world.matcher.takeEvents();
  for (const e of events) {
    if (e.kind !== "fill") continue;
    if (e.takerOwner === PLAYER) world.portfolio.apply(e.takerSide, e.price, e.qty);
    else if (e.makerOwner === PLAYER) {
      world.portfolio.apply(e.takerSide === "buy" ? "sell" : "buy", e.price, e.qty);
    }
  }
  return events.filter((e) => e.kind === "fill");
}

function snapshot(
  world: World,
  scenario: Scenario,
  running: boolean,
  trades: Trade[],
): SimState {
  return {
    tick: world.clock.tick,
    trades,
    remaining: Math.max(0, scenario.durationTicks - world.clock.tick),
    bids: world.book.levels("buy"),
    asks: world.book.levels("sell"),
    position: world.portfolio.position,
    cash: world.portfolio.cash,
    realised: world.portfolio.realised,
    running,
  };
}
