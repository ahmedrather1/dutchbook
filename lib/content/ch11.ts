import { flat, makeMarketMaker, makeNoiseTaker } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import type { Chapter } from "./schema";

const TICK = 10;

/** Thin and busy: orders partially fill, and competitors take what you wanted. */
const contested: Scenario = {
  id: "ch11-contested",
  seed: 111,
  tickSize: TICK,
  durationTicks: 120,
  startingCash: cents(200 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(470), qty: 10 },
    { side: "buy", price: ticks(450), qty: 22 },
    { side: "sell", price: ticks(520), qty: 9 },
    { side: "sell", price: ticks(545), qty: 20 },
    { side: "sell", price: ticks(580), qty: 60 },
  ],
  fairValue: flat(500),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 22, size: 9, refreshEvery: 4, widenPerFill: 20 }),
    makeNoiseTaker({ id: "rival", frequency: 0.75, minSize: 4, maxSize: 14 }),
  ],
};

export const chapter11: Chapter = {
  number: 11,
  slug: "execution",
  title: "Execution",
  teaches: "Latency, partial fills, rate limits, and writing an order policy a bot can follow.",
  estimatedMinutes: 40,

  objectives: [
    { id: "partial-fills", statement: "Decide what to do when only part of an order fills." },
    { id: "rate-limits", statement: "Budget requests against a venue's rate limits." },
    { id: "queue-management", statement: "Manage a resting order with queue position in mind." },
    { id: "stale-data", statement: "Reason about acting on market data that is already out of date." },
    { id: "order-policy", statement: "Write an execution policy explicit enough for a bot to follow." },
  ],

  lessons: [
    {
      id: "partial-fills",
      title: "Half a trade",
      objectives: ["partial-fills"],
      defines: ["partial fill"],
      points: [
        "You ask for 100 and get 40. That is a **partial fill**, and it is the norm.",
        "For a directional bet, 40 is simply a smaller bet. Fine.",
        "For an arbitrage, 40 of one leg and 100 of the other is **not** an arb.",
        "So decide in advance: chase the rest, cut to match, or unwind entirely.",
        "A bot without an answer here will accumulate broken positions silently.",
      ],
      body: [
        "Your order is a request, not an outcome. Ask for a hundred and you may get forty.",
        "If you were making a directional bet, that is mildly annoying: you have a smaller position than intended. If you were building an arbitrage, it is a different thing entirely — forty of one leg against a hundred of the other is not a hedged position, it is sixty contracts of naked exposure you never chose.",
        "This has to be decided before it happens, because it will happen constantly. Chase the remainder at a worse price? Cut the other leg down to match? Unwind the whole thing and stand down? Each is defensible; having no answer is not.",
        "A bot with no partial-fill policy does not crash. It quietly accumulates broken positions while reporting that everything is fine, which is considerably worse.",
      ],
    },
    {
      id: "rate-limits",
      title: "You only get so many requests",
      objectives: ["rate-limits"],
      defines: ["rate limit"],
      points: [
        "Venues cap how many requests you may send. That is a **rate limit**.",
        "Exceed it and you are throttled or blocked — usually at the worst moment.",
        "Rapid-fire cancel-and-replace burns your budget fastest.",
        "Spend requests where they matter: fewer, better-chosen orders.",
        "Budget it deliberately, the way you budget capital.",
      ],
      body: [
        "Every venue limits how fast you may talk to it, and the limit is not generous.",
        "The failure mode is unpleasant because of when it arrives. A naive bot idles quietly, then something interesting happens and it fires a burst of cancels and replacements — and gets throttled exactly during the seconds it most wanted to act. The rate limit bites precisely when the opportunity is there.",
        "Treat request budget as a scarce resource, like capital. Fewer, better-chosen orders beat constant repricing. And when you do need a burst, make sure you have not already spent the budget on housekeeping.",
      ],
    },
    {
      id: "queue-and-staleness",
      title: "Where you are in line, and when you are looking",
      objectives: ["queue-management", "stale-data"],
      defines: [],
      points: [
        "A resting order's value depends on queue position, not just price.",
        "Cancel and replace at the same price and you go to the **back** of the queue.",
        "So repricing is not free even when the price does not change.",
        "Every book you see is already slightly out of date.",
        "Act on what was true a moment ago, and size for the possibility it has changed.",
      ],
      body: [
        "Two things that only become obvious once you are doing this programmatically.",
        "First, queue position is part of what your resting order is worth. Cancel it and put it back at the same price, and you have just moved to the back of the line behind everyone who was already there. A bot that reprices on every tick keeps destroying the position it spent time earning.",
        "Second, the book on your screen is history. By the time the data reached you, was parsed, and led to a decision, the market has moved on. You are always acting on a slightly stale picture — which is Chapter 9 from the other side, and the reason your fills will sometimes surprise you.",
        "Neither is solvable. Both are manageable, if you assume them rather than being surprised by them.",
      ],
    },
    {
      id: "policy",
      title: "Writing it down",
      objectives: ["order-policy"],
      defines: ["execution policy"],
      points: [
        "An **execution policy** says exactly what your bot does, before it does it.",
        "Which leg first, and why.",
        "What size, and what caps it.",
        "What happens on a partial fill.",
        "What happens on a rejection or a timeout.",
        "When to stop trading entirely.",
        "If you cannot write it in plain words, you cannot code it.",
      ],
      body: [
        "Everything in this chapter comes together as one artefact: a policy you can state in plain language before any code exists.",
        "It has to answer: which leg goes first and why; what size, and what caps it; what happens when you get a partial fill; what happens on a rejection, a timeout, or a throttle; and under what conditions the bot stops trading altogether.",
        "Write it as sentences. If you cannot say it clearly in English, you do not understand it well enough to implement it, and the code will end up encoding whatever you happened to think of while typing.",
        "This is also exactly what Chapter 12 will demand of you. The coach there will not write a line until you have stated your strategy in these terms — entry, sizing, exit, and the risk you are accepting. Getting fluent at it now is the point of this chapter.",
      ],
    },
  ],

  drills: [
    {
      kind: "choice",
      id: "d11-partial-arb",
      objectives: ["partial-fills"],
      prompt: "Your first arb leg fills 40 of 100. The second leg is still available in full. What now?",
      options: [
        "Take 100 of the second leg",
        "Take 40 of the second leg to match",
        "Take none and hold the 40",
        "Double the first leg",
      ],
      answerIndex: 1,
      explanation:
        "Match the size you actually got. Taking 100 leaves 60 naked on the other side; holding 40 unhedged leaves a directional bet. Matching keeps it an arbitrage, just a smaller one.",
    },
    {
      kind: "choice",
      id: "d11-rate-limit",
      objectives: ["rate-limits"],
      prompt: "Your bot cancels and replaces its quotes every tick and is throttled during a news event. What went wrong?",
      options: [
        "The venue is unreliable",
        "It spent its request budget on housekeeping and had none left when it mattered",
        "Its orders were too large",
        "It should have used market orders",
      ],
      answerIndex: 1,
      explanation:
        "Constant repricing burns the budget on quotes that mostly did not need changing. Rate limits bite when activity spikes, which is exactly when you needed the capacity.",
    },
    {
      kind: "choice",
      id: "d11-queue",
      objectives: ["queue-management"],
      prompt: "You cancel a resting order and immediately replace it at the same price. What did that cost?",
      options: [
        "Nothing — same price",
        "Your queue position; you are now at the back",
        "A fee",
        "The spread",
      ],
      answerIndex: 1,
      explanation:
        "Price-time priority means the replacement is treated as a new arrival, behind everyone already resting there. Repricing is never free, even when the price is unchanged.",
    },
    {
      kind: "choice",
      id: "d11-stale",
      objectives: ["stale-data"],
      prompt: "How should a bot treat the order book it just received?",
      options: [
        "As the current state of the market",
        "As slightly out of date, and size accordingly",
        "As unreliable and ignore it",
        "As current only if the venue is fast",
      ],
      answerIndex: 1,
      explanation:
        "There is always delay between the market changing and you knowing about it. You cannot remove it, so assume it: act on the picture you have and size for the chance it has already moved.",
    },
    {
      kind: "choice",
      id: "d11-policy",
      objectives: ["order-policy"],
      prompt: "Which of these belongs in an execution policy?",
      options: [
        "Your view on the event",
        "What the bot does when a leg is rejected",
        "The venue's fee schedule",
        "The expected resolution date",
      ],
      answerIndex: 1,
      explanation:
        "A policy covers what the bot does mechanically: sequencing, sizing, partial fills, rejections, and when to stop. Your view belongs in the strategy that decides whether to trade at all.",
    },
  ],

  scenarios: [
    {
      id: "contested-book",
      scenario: contested,
      brief:
        "Thin book, busy rival. Try to build 40 contracts and watch how rarely you get what you asked for in one go. Decide your partial-fill rule before you start, then stick to it.",
      objectives: ["partial-fills", "queue-management"],
      success: [
        { kind: "min-position", qty: 25, label: "Build the position despite partial fills" },
        { kind: "max-average-cost", ticks: 560, label: "Without chasing the price up" },
      ],
    },
  ],

  test: {
    passThreshold: 0.85,
    objectiveFloor: 0.6,
    drills: [
      {
        kind: "choice",
        id: "t11-partial",
        objectives: ["partial-fills"],
        prompt: "What is the danger of a partial fill on an arbitrage, specifically?",
        options: [
          "A smaller profit",
          "Unhedged exposure you did not choose",
          "Higher fees",
          "Losing queue position",
        ],
        answerIndex: 1,
        explanation:
          "A smaller arb is still an arb. The danger is mismatched legs, which converts a riskless trade into a directional bet on an event you had no view on.",
      },
      {
        kind: "choice",
        id: "t11-rate",
        objectives: ["rate-limits"],
        prompt: "When do rate limits usually cause real damage?",
        options: [
          "During quiet periods",
          "During bursts of activity, when you most need capacity",
          "At market open only",
          "When orders are too large",
        ],
        answerIndex: 1,
        explanation:
          "Throttling arrives when activity spikes, which is when opportunities appear. Budget requests so capacity is available then rather than spent on routine repricing.",
      },
      {
        kind: "choice",
        id: "t11-queue2",
        objectives: ["queue-management"],
        prompt: "Why might a bot that reprices constantly perform worse than one that does not?",
        options: [
          "It pays more fees",
          "It keeps losing queue position and rarely gets filled as maker",
          "It uses more memory",
          "Its prices are worse",
        ],
        answerIndex: 1,
        explanation:
          "Every replacement goes to the back of the queue, so an order that reprices frequently never accumulates priority and rarely fills at the price it wanted.",
      },
      {
        kind: "choice",
        id: "t11-policy2",
        objectives: ["order-policy", "stale-data"],
        prompt: "What is the test of whether your execution policy is complete?",
        options: [
          "It has been backtested",
          "You can state it in plain sentences covering sequencing, sizing, partials, failures, and stopping",
          "It has no losing days",
          "It uses limit orders only",
        ],
        answerIndex: 1,
        explanation:
          "If you cannot say it clearly in words, you cannot implement it faithfully. Chapter 12 requires exactly this statement before it will help you write any code.",
      },
    ],
  },
};
