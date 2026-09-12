import { flat, jump, makeClumsyTrader, makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";

const TICK = 10;
const CASH = cents(200 * ONE_DOLLAR);

const base = {
  tickSize: TICK,
  startingCash: CASH,
  durationTicks: 120,
} as const;

/** A recurring, obvious mispricing. The guided first strategy should handle this. */
const gentle: Scenario = {
  ...base,
  id: "capstone-gentle",
  seed: 201,
  initialBook: [
    { side: "buy", price: ticks(430), qty: 40 },
    { side: "buy", price: ticks(410), qty: 90 },
    { side: "sell", price: ticks(470), qty: 40 },
    { side: "sell", price: ticks(500), qty: 90 },
  ],
  fairValue: flat(480),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 25, size: 35, refreshEvery: 4 }),
    makeNoiseTaker({ id: "noise", frequency: 0.4, minSize: 3, maxSize: 12 }),
    makeClumsyTrader({ id: "clumsy", everyTicks: 7, size: 14, giveaway: 45 }),
  ],
};

/** Thin, so a strategy that ignores depth will overpay badly. */
const thin: Scenario = {
  ...base,
  id: "capstone-thin",
  seed: 202,
  initialBook: [
    { side: "buy", price: ticks(440), qty: 6 },
    { side: "buy", price: ticks(400), qty: 18 },
    { side: "sell", price: ticks(520), qty: 5 },
    { side: "sell", price: ticks(570), qty: 16 },
    { side: "sell", price: ticks(640), qty: 50 },
  ],
  fairValue: wander(490, 6, 77),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 35, size: 6, refreshEvery: 5, widenPerFill: 25 }),
    makeNoiseTaker({ id: "rival", frequency: 0.7, minSize: 3, maxSize: 10 }),
    // Rarer and smaller here: the edge exists but the book cannot absorb size.
    makeClumsyTrader({ id: "clumsy", everyTicks: 11, size: 5, giveaway: 60 }),
  ],
};

/** News mid-run. A strategy that never re-evaluates gets caught holding. */
const shock: Scenario = {
  ...base,
  id: "capstone-shock",
  seed: 203,
  durationTicks: 140,
  initialBook: [
    { side: "buy", price: ticks(500), qty: 30 },
    { side: "buy", price: ticks(470), qty: 80 },
    { side: "sell", price: ticks(540), qty: 30 },
    { side: "sell", price: ticks(580), qty: 80 },
  ],
  fairValue: jump(520, 240, 60),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 25, size: 28, refreshEvery: 6 }),
    makeNoiseTaker({ id: "noise", frequency: 0.45, minSize: 3, maxSize: 14 }),
    makeClumsyTrader({ id: "clumsy", everyTicks: 9, size: 12, giveaway: 50 }),
  ],
  resolution: { atTick: 140, outcome: "no" },
};

/** Held out: never shown before the final run, so a memorised solution fails. */
const heldOut: Scenario = {
  ...base,
  id: "capstone-held-out",
  seed: 977,
  durationTicks: 130,
  initialBook: [
    { side: "buy", price: ticks(280), qty: 25 },
    { side: "buy", price: ticks(250), qty: 70 },
    { side: "sell", price: ticks(330), qty: 22 },
    { side: "sell", price: ticks(380), qty: 70 },
  ],
  fairValue: wander(305, 10, 313),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 28, size: 22, refreshEvery: 5, widenPerFill: 8 }),
    makeNoiseTaker({ id: "noise", frequency: 0.5, minSize: 3, maxSize: 12 }),
    // Different cadence and size from the others: a strategy tuned to them must still work.
    makeClumsyTrader({ id: "clumsy", everyTicks: 6, size: 9, giveaway: 40 }),
  ],
  resolution: { atTick: 130, outcome: "yes" },
};

/** What a strategy is scored against (J-4). Includes one it has never seen. */
export const CAPSTONE_SUITE: readonly Scenario[] = [gentle, thin, shock, heldOut];
