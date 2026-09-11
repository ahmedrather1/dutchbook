import { flat, jump, makeInformedTrader, makeMarketMaker, makeNoiseTaker } from "./agents";
import { cents, ticks, ONE_DOLLAR } from "./money";
import type { Scenario } from "./sim";

const TICK = 10;
const CASH = cents(100 * ONE_DOLLAR);

/** A calm two-sided market. Chapter 1 reads this book; the tests use it as a baseline. */
export const calmMarket: Scenario = {
  id: "calm-market",
  seed: 1,
  tickSize: TICK,
  durationTicks: 40,
  startingCash: CASH,
  initialBook: [
    { side: "buy", price: ticks(600), qty: 50 },
    { side: "sell", price: ticks(640), qty: 50 },
  ],
  fairValue: flat(620),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 40, refreshEvery: 5, widenPerFill: 5 }),
    makeNoiseTaker({ id: "noise", frequency: 0.2, minSize: 1, maxSize: 8 }),
  ],
};

/** News repricies fair value mid-run and the informed trader punishes stale quotes (Ch 9). */
export const newsShock: Scenario = {
  ...calmMarket,
  id: "news-shock",
  seed: 7,
  durationTicks: 60,
  fairValue: jump(620, 850, 30),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 40, refreshEvery: 8, widenPerFill: 5 }),
    makeNoiseTaker({ id: "noise", frequency: 0.2, minSize: 1, maxSize: 8 }),
    makeInformedTrader({
      id: "informed",
      frequency: 0.5,
      minSize: 5,
      maxSize: 20,
      edgeThreshold: 30,
    }),
  ],
  resolution: { atTick: 60, outcome: "yes" },
};
