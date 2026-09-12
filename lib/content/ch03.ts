import { makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { decimalOdds, edgeInCents, priceToProbability } from "./generate";
import type { Chapter } from "./schema";

const TICK = 10;

/**
 * A market that keeps offering the same small edge. Take it repeatedly and the point
 * lands: a real edge still loses plenty of individual trades.
 */
const repeatedEdge: Scenario = {
  id: "ch03-repeated-edge",
  seed: 31,
  tickSize: TICK,
  durationTicks: 120,
  startingCash: cents(100 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(480), qty: 30 },
    { side: "buy", price: ticks(470), qty: 60 },
    { side: "sell", price: ticks(520), qty: 30 },
    { side: "sell", price: ticks(530), qty: 60 },
  ],
  fairValue: wander(520, 4, 77),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 25, refreshEvery: 4 }),
    makeNoiseTaker({ id: "noise", frequency: 0.45, minSize: 2, maxSize: 10 }),
  ],
  resolution: { atTick: 120, outcome: "yes" },
};

export const chapter3: Chapter = {
  number: 3,
  slug: "probability-and-ev",
  title: "Probability & expected value",
  teaches: "Fair value, edge, odds formats, and why a good bet still loses often.",
  estimatedMinutes: 30,

  objectives: [
    { id: "fair-value", statement: "State what a contract is worth if you believe a given probability." },
    { id: "compute-edge", statement: "Compute your edge in cents against a quoted price." },
    { id: "odds-formats", statement: "Convert between price, probability, and decimal odds." },
    { id: "expected-value", statement: "Compute the expected value of a trade." },
    { id: "variance", statement: "Explain why a positive-edge trade frequently loses." },
  ],

  lessons: [
    {
      id: "fair-value",
      title: "What is it actually worth?",
      objectives: ["fair-value", "compute-edge"],
      defines: ["fair value", "edge"],
      points: [
        "**Fair value** is what a contract is worth *to you*, given what you believe.",
        "Think it is 70% likely? Then it is worth 70¢ to you. That simple.",
        "**Edge** is fair value minus the price you pay.",
        "Worth 70¢, costs 62¢ → 8¢ of edge. Costs 74¢ → negative 4¢, so don't buy.",
        "Edge is the whole game. Everything else is sizing and execution.",
      ],
      body: [
        "You already know the market's price is its estimate of the probability. Now here is your side of it.",
        "If you believe an event is 70% likely, then a contract paying $1.00 when it happens is worth 70¢ to you. That is its fair value — not what it costs, what it is worth given your belief.",
        "Now compare the two numbers. If the market will sell it to you at 62¢ and you think it is worth 70¢, you have 8¢ of edge. If it costs 74¢, your edge is negative 4¢, and the interesting trade is the other direction.",
        "Everything in this course after this point is a variation on finding that gap. Arbitrage, which you'll meet in Chapter 6, is just the special case where the gap doesn't depend on you being right about anything.",
      ],
    },
    {
      id: "odds",
      title: "The same number, three ways",
      objectives: ["odds-formats"],
      defines: ["decimal odds"],
      points: [
        "Price $0.25 = probability 25% = **decimal odds** 4.00.",
        "Decimal odds = 1 ÷ probability. It is what $1 returns in total.",
        "Sportsbooks and prediction markets often quote the same bet differently.",
        "Converting fluently is how you compare them — which Chapter 7 needs.",
      ],
      body: [
        "The same bet gets quoted in different dialects depending on where you are standing, and you need to move between them without thinking.",
        "A contract at $0.25 implies 25%. In decimal odds that is 4.00, because 1 ÷ 0.25 = 4 — stake a dollar, get four back in total if you win.",
        "This matters more than it looks. In Chapter 7 you will compare the same real-world event priced on two different venues, and they may not be speaking the same dialect. If converting is slow or error-prone for you, you will miss things that are right in front of you.",
      ],
    },
    {
      id: "ev",
      title: "Expected value",
      objectives: ["expected-value"],
      defines: ["expected value"],
      points: [
        "**Expected value** is what a trade earns on average, across every outcome.",
        "For a binary contract: EV per contract = your probability − the price.",
        "Buy at 62¢ believing 70% → EV = +8¢ per contract.",
        "It is an average, not a prediction. This specific trade wins 70¢ or loses 62¢.",
      ],
      body: [
        "Expected value is what you would earn per trade if you could somehow make the identical trade thousands of times.",
        "For a binary contract the arithmetic is unusually kind. Buy at 62¢ believing 70%: seven times out of ten you get $1.00, three times you get nothing. Average that out and you have 70¢, against 62¢ paid. Expected value is 8¢ per contract.",
        "Hold on to the word average. This particular trade will not earn 8¢. It will earn 38¢ or lose 62¢, and nothing in between. The 8¢ only shows up across many trades.",
      ],
    },
    {
      id: "variance",
      title: "Being right and losing anyway",
      objectives: ["variance"],
      defines: ["variance"],
      points: [
        "A 55% bet loses 45% of the time. That is not a mistake, it is the design.",
        "**Variance** is the spread of outcomes around the average.",
        "Six losses in ten with a real edge is completely ordinary.",
        "You cannot tell a good trade from a bad one by whether it won.",
        "Judge the process. The results need a lot of trades before they mean much.",
      ],
      body: [
        "This is the part that breaks people, and it is worth more attention than the arithmetic.",
        "Take a bet you win 55% of the time. You will lose it 45% of the time. Run ten and losing six is unremarkable — it happens roughly one time in four. Nothing has gone wrong. That is simply what a 55% edge looks like up close.",
        "Variance is the name for that spread around the average, and it is the reason you cannot judge a trade by its outcome. A winning trade can have been a terrible idea. A losing trade can have been exactly right.",
        "So judge the process: was there real edge, and was the size sensible? The results will confirm it eventually, but eventually is a lot further away than most people assume. Chapter 10 turns this into a rule for how much to bet.",
      ],
    },
  ],

  drills: [
    priceToProbability("d3-prob", ["odds-formats"]),
    decimalOdds("d3-decimal", ["odds-formats"]),
    edgeInCents("d3-edge", ["compute-edge", "fair-value"]),
    edgeInCents("d3-edge-2", ["expected-value"]),
    {
      kind: "choice",
      id: "d3-fair-value",
      objectives: ["fair-value"],
      prompt: "You are confident an event is 40% likely. What is a contract on it worth to you?",
      options: ["$0.40", "$0.60", "$1.00", "It depends on the price"],
      answerIndex: 0,
      explanation:
        "Fair value is just your probability expressed in dollars: 40% means 40¢. What it costs is a separate question, and the gap between the two is your edge.",
    },
    {
      kind: "choice",
      id: "d3-variance",
      objectives: ["variance"],
      prompt:
        "You have made ten trades with a genuine 4% edge and lost six of them. What does that tell you?",
      options: [
        "Your edge is not real",
        "Very little — ten trades is far too few to tell",
        "You should double your size to catch up",
        "You should stop trading",
      ],
      answerIndex: 1,
      explanation:
        "Ten trades tells you almost nothing. A small edge is buried in variance at that sample size, and losing six of ten is entirely ordinary. Judge the process, not a handful of outcomes.",
    },
    {
      kind: "choice",
      id: "d3-ev-sign",
      objectives: ["expected-value"],
      prompt: "A contract is offered at $0.80. You think the event is 65% likely. What now?",
      options: [
        "Buy — the price is high so it is likely",
        "Do not buy; consider selling instead",
        "Buy a smaller size",
        "Wait for the price to rise",
      ],
      answerIndex: 1,
      explanation:
        "It is worth 65¢ to you and costs 80¢, so buying loses 15¢ of value per contract. When the market is paying more than you think it is worth, the interesting direction is the other one.",
    },
  ],

  scenarios: [
    {
      id: "many-small-edges",
      scenario: repeatedEdge,
      brief:
        "This market resolves YES at the end, so anything you buy below $1.00 makes money in the end. But watch the price swing against you on the way there. Buy 20 and hold to resolution.",
      objectives: ["expected-value", "variance"],
      success: [
        { kind: "min-position", qty: 20, label: "Take the edge at least once" },
        { kind: "min-realised", cents: 1, label: "Finish ahead after settlement" },
      ],
    },
  ],

  test: {
    passThreshold: 0.8,
    drills: [
      priceToProbability("t3-prob", ["odds-formats"]),
      decimalOdds("t3-decimal", ["odds-formats"]),
      edgeInCents("t3-edge", ["compute-edge"]),
      edgeInCents("t3-edge-2", ["expected-value"]),
      {
        kind: "choice",
        id: "t3-fair-value",
        objectives: ["fair-value"],
        prompt: "What does fair value depend on?",
        options: [
          "The current market price",
          "What you believe the probability is",
          "The size resting at the best offer",
          "How long until it resolves",
        ],
        answerIndex: 1,
        explanation:
          "Fair value is your own estimate turned into dollars. If it depended on the price, you could never disagree with the market — and disagreeing is the only way to have an edge.",
      },
      {
        kind: "choice",
        id: "t3-variance",
        objectives: ["variance"],
        prompt: "Which of these is strong evidence that a trade was a mistake?",
        options: [
          "It lost money",
          "It lost money three times in a row",
          "There was no edge at the price paid",
          "The price moved against you afterwards",
        ],
        answerIndex: 2,
        explanation:
          "Only the third describes the decision. The others describe outcomes, and outcomes are noisy — a good trade loses regularly and a bad one wins regularly.",
      },
    ],
  },
};
