/**
 * The architecture map rendered at /guide.
 *
 * Paths here are asserted to exist by a test, so the guide cannot drift from the code it
 * describes (N-2).
 */
export interface Layer {
  id: string;
  name: string;
  path: string;
  owns: string;
  never: string;
  files: string[];
}

export const LAYERS: readonly Layer[] = [
  {
    id: "app",
    name: "Routes",
    path: "app/",
    owns: "The landing page, the chapter routes, and this guide.",
    never: "Never contains game logic. A route composes; it does not decide.",
    files: ["app/page.tsx", "app/play/[slug]/page.tsx", "app/guide/page.tsx"],
  },
  {
    id: "ui",
    name: "Components",
    path: "components/",
    owns: "Order book, order ticket, tape, drills, the strategy lab, the coach panel.",
    never: "Never fetches data and never computes P&L. It renders what the engine emits.",
    files: [
      "components/OrderBook.tsx",
      "components/OrderTicket.tsx",
      "components/StrategyLab.tsx",
      "components/useSimulation.ts",
    ],
  },
  {
    id: "learning",
    name: "Learning loop",
    path: "lib/learning/",
    owns: "Scoring, mastery gating, remediation, Kelly sizing.",
    never: "Never scores on profit alone: a lucky run that missed the objective does not pass.",
    files: [
      "lib/learning/score.ts",
      "lib/learning/gate.ts",
      "lib/learning/remediate.ts",
      "lib/learning/kelly.ts",
    ],
  },
  {
    id: "content",
    name: "Content",
    path: "lib/content/",
    owns: "Twelve typed chapters and the seeded drill generators.",
    never: "Never uses a term before the lesson that defines it; a test enforces it.",
    files: [
      "lib/content/schema.ts",
      "lib/content/registry.ts",
      "lib/content/generate.ts",
      "lib/content/arbGenerate.ts",
    ],
  },
  {
    id: "sandbox",
    name: "Strategy sandbox",
    path: "lib/sandbox/",
    owns: "The strategy API, the Web Worker runtime, and scoring across held-out markets.",
    never:
      "Player code never reaches the network or the page: those globals are shadowed, not merely unset.",
    files: [
      "lib/sandbox/api.ts",
      "lib/sandbox/runner.ts",
      "lib/sandbox/sandbox.ts",
      "lib/sandbox/score.ts",
    ],
  },
  {
    id: "venues",
    name: "Venues",
    path: "lib/venues/",
    owns: "Polymarket and Kalshi: fees, ticks, merge, negative risk, true cost.",
    never:
      "Never encodes a parameter from memory. Every number cites a source and a date in docs/venues.md.",
    files: [
      "lib/venues/venue.ts",
      "lib/venues/kalshi.ts",
      "lib/venues/polymarket.ts",
      "lib/venues/cost.ts",
    ],
  },
  {
    id: "engine",
    name: "Engine",
    path: "lib/engine/",
    owns: "Matching, the clock, agents, portfolio, latency. Pure TypeScript.",
    never:
      "Never imports React, touches the DOM, calls the network, uses Math.random, or puts money in a float.",
    files: [
      "lib/engine/book.ts",
      "lib/engine/match.ts",
      "lib/engine/portfolio.ts",
      "lib/engine/agents.ts",
    ],
  },
];

export interface Invariant {
  id: string;
  title: string;
  why: string;
}

export const INVARIANTS: readonly Invariant[] = [
  {
    id: "D18",
    title: "Determinism",
    why: "Every run replays from (scenarioId, seed, actions). Math.random is lint-banned in lib/. Without it, grading is not trustworthy and a player's bad run cannot be reproduced during remediation.",
  },
  {
    id: "D20",
    title: "No floats for money",
    why: "Prices and cash are integers in sub-cent units. A float bug already cost a whole cent in the Kalshi fee, which rounds up: 0.07 × 100 × 0.25 × 1000 evaluates to 1750.0000000000002.",
  },
  {
    id: "D19",
    title: "The engine is pure",
    why: "lib/engine imports no React, touches no DOM, makes no network call. This is what lets the same engine run headless inside the capstone worker and be unit-tested alone.",
  },
  {
    id: "D14",
    title: "Venue facts are cited",
    why: "Every real parameter carries a source URL and a checked-on date. A confidently wrong fee formula teaches a false lesson and would produce a losing bot.",
  },
  {
    id: "D23",
    title: "The coach never gives the answer",
    why: "It requires entry, sizing, exit, and accepted risk before writing anything. The refusal is structural — the message never reaches the model — so prompt injection has nothing to talk around.",
  },
  {
    id: "D28",
    title: "Player code is sandboxed",
    why: "A Web Worker with the dangerous globals shadowed as function parameters, plus a watchdog that terminates a runaway. The first version of this guarantee was false, and a browser test caught it.",
  },
];
