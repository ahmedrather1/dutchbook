import { makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { costOfTrade, priceToProbability, readTheBook } from "./generate";
import type { Chapter } from "./schema";

const TICK = 10;

const quietBook: Scenario = {
  id: "ch01-quiet-book",
  seed: 11,
  tickSize: TICK,
  durationTicks: 60,
  startingCash: cents(100 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(590), qty: 12 },
    { side: "buy", price: ticks(580), qty: 25 },
    { side: "buy", price: ticks(570), qty: 40 },
    { side: "sell", price: ticks(630), qty: 14 },
    { side: "sell", price: ticks(640), qty: 28 },
    { side: "sell", price: ticks(650), qty: 45 },
  ],
  // Drifting, not flat: prices have to move or there is nothing to notice.
  fairValue: wander(610, 6, 31),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 18, refreshEvery: 3 }),
    makeMarketMaker({ id: "mm2", halfSpread: 40, size: 30, refreshEvery: 5 }),
    makeNoiseTaker({ id: "noise", frequency: 0.55, minSize: 2, maxSize: 12 }),
  ],
};

const firstTrade: Scenario = {
  ...quietBook,
  id: "ch01-first-trade",
  seed: 12,
  durationTicks: 90,
};

export const chapter1: Chapter = {
  number: 1,
  slug: "markets-and-probability",
  title: "Markets & price-as-probability",
  teaches: "How to read an order book, and why a price is a probability.",
  estimatedMinutes: 25,

  objectives: [
    { id: "read-bid-ask", statement: "Read the best bid and best ask from an order book." },
    { id: "read-spread", statement: "Identify the spread and say what it costs you." },
    { id: "read-depth", statement: "Read how much size is available at a price." },
    { id: "which-side", statement: "Say which side of the book you trade against when buying or selling." },
    { id: "price-is-probability", statement: "Convert between a contract price and the probability it implies." },
  ],

  lessons: [
    {
      id: "what-is-a-market",
      title: "A market is two lists",
      objectives: ["read-bid-ask", "which-side"],
      defines: ["bid", "ask", "order book"],
      points: [
        "An order book is two lists: people waiting to buy, and people waiting to sell.",
        "**Bid** = best price someone will buy at. **Ask** = best price someone will sell at.",
        "There is no single price — there are two.",
        "Buying now? You pay the ask. Selling now? You get the bid.",
      ],
      body: [
        "Forget charts for a minute. A market is really just two lists of people waiting.",
        "On one side, people who want to buy, each with a price they're willing to pay. On the other, people who want to sell, each with a price they'll accept. Put the two lists side by side and you've got an order book. That's the panel on your right.",
        "The best offer to buy is called the bid. The best offer to sell is called the ask. Those are the only two prices you can actually trade at right now — everything else is someone hoping.",
        "Here's the part that trips people up: there isn't one price. There are two, and which one you get depends on what you want. Buying right now? You pay the ask. Selling right now? You get the bid. You always trade against the other side.",
      ],
    },
    {
      id: "the-spread",
      title: "The gap between them is a cost",
      objectives: ["read-spread"],
      defines: ["spread"],
      points: [
        "**Spread** = the gap between the bid and the ask.",
        "Buy and instantly sell back, and you lose the spread for doing nothing.",
        "It is not a fee. It is what impatience costs.",
        "Wide spread = expensive to trade in and out. It says nothing about which way the event resolves.",
      ],
      body: [
        "The bid always sits below the ask. That gap has a name: the spread.",
        "Want to see why it matters? Buy something and sell it back one second later. You paid the ask, you got back the bid, and you're down — for doing absolutely nothing.",
        "Nobody charged you a fee. That's just what it costs to be impatient. Waiting is free; trading right now isn't. We'll come back to this in Chapter 5 and put a number on it, because it's one of the main reasons a trade that looks profitable on paper isn't.",
      ],
    },
    {
      id: "depth",
      title: "A price is only good for so much size",
      objectives: ["read-depth"],
      defines: ["depth", "size"],
      points: [
        "**Depth** = how many contracts are available at a given price.",
        "A price is a promise about a specific size, not any size.",
        "Want more than is on offer? The rest fills at worse prices.",
        "An edge that exists for 10 contracts but not 10,000 is a different edge.",
      ],
      body: [
        "Look next to each price and you'll see a number. That's how many contracts are actually available there. Traders call it depth.",
        "Say the best ask is $0.64, and there are 35 contracts at that price. You want 100. You'll get 35 of them at $0.64 — and then the price you pay gets worse, because you have to reach further up the book for the rest.",
        "So the price on screen isn't a promise about any amount you like. It's a promise about a specific amount. Keep that in mind: an opportunity that's there for 10 contracts and gone by 10,000 is a completely different opportunity, and later on it's the difference between a strategy that works and one that only looked like it would.",
      ],
    },
    {
      id: "price-is-probability",
      title: "The price is the probability",
      objectives: ["price-is-probability"],
      defines: ["binary contract", "settle"],
      points: [
        "A **binary contract** pays $1.00 if the event happens, $0.00 if it does not.",
        "So its price is what the crowd thinks it is worth — between $0 and $1.",
        "$0.62 means the market thinks **62% likely**.",
        "Price and probability are the same number. One just has a dollar sign on it.",
      ],
      body: [
        "Here's where prediction markets get interesting. A contract pays exactly $1.00 if the thing happens, and exactly $0.00 if it doesn't. Nothing in between. That's a binary contract, and the moment it pays out is called settling.",
        "Now think about what one should cost. Suppose it's trading at $0.62. If you're certain the event happens, that contract is worth a dollar to you and $0.62 is a bargain. If you're certain it won't, it's worth nothing and $0.62 is madness.",
        "Somewhere between those two people, a price gets agreed. And that price is the market's best guess at how likely the thing actually is. $0.62 means the crowd thinks 62%.",
        "That's the whole idea, and it's worth sitting with: the price and the probability are the same number. One just has a dollar sign in front of it.",
      ],
    },
  ],

  drills: [
    readTheBook("d-best-bid", ["read-bid-ask"], "best-bid"),
    readTheBook("d-best-ask", ["read-bid-ask"], "best-ask"),
    readTheBook("d-spread", ["read-spread"], "spread"),
    readTheBook("d-depth", ["read-depth"], "depth-at-best-ask"),
    priceToProbability("d-probability", ["price-is-probability"]),
    {
      kind: "choice",
      id: "d-which-side-buy",
      objectives: ["which-side"],
      prompt: "You want to buy right now. Which price do you get?",
      options: ["The bid", "The ask", "The midpoint", "Whichever is closer"],
      answerIndex: 1,
      explanation:
        "You pay the ask. The ask is what sellers are asking for, and buying immediately means accepting one of their offers. The bid is what you would receive if you were selling.",
    },
    {
      kind: "choice",
      id: "d-which-side-sell",
      objectives: ["which-side"],
      prompt: "You want to sell right now. Which price do you get?",
      options: ["The ask", "The bid", "Your purchase price", "The last traded price"],
      answerIndex: 1,
      explanation:
        "You receive the bid — the highest price someone is willing to pay. What you originally paid has no bearing on what the market will give you now.",
    },
    {
      kind: "choice",
      id: "d-wide-spread-meaning",
      objectives: ["read-spread"],
      prompt: "One market has a 1¢ spread, another has a 9¢ spread. What does the wider one tell you?",
      options: [
        "It is more likely to resolve YES",
        "Trading it immediately costs you more",
        "It has more participants",
        "Its price is more accurate",
      ],
      answerIndex: 1,
      explanation:
        "A wide spread means buying and immediately selling loses you more. It usually signals fewer participants and less certainty — but it says nothing about which way the event will resolve.",
    },
  ],

  scenarios: [
    {
      id: "read-only",
      scenario: quietBook,
      brief:
        "Press Start and just watch for a bit. Find the best bid and the best ask — they're the two prices closest to the middle. Notice the spread between them widen and tighten as people trade.",
      objectives: ["read-bid-ask", "read-spread", "read-depth"],
      success: [{ kind: "answer", questionId: "read-only-check", label: "Read the book correctly" }],
    },
    {
      id: "first-trade",
      scenario: firstTrade,
      brief:
        "Your turn. Before you touch anything, look at the ask and work out what 10 contracts should cost you. Then buy 10 and see if you were right.",
      objectives: ["which-side", "read-depth"],
      success: [{ kind: "min-position", qty: 10, label: "Buy at least 10 contracts" }],
    },
  ],

  test: {
    passThreshold: 0.8,
    drills: [
      readTheBook("t-best-bid", ["read-bid-ask"], "best-bid"),
      readTheBook("t-best-ask", ["read-bid-ask"], "best-ask"),
      readTheBook("t-spread", ["read-spread"], "spread"),
      readTheBook("t-depth", ["read-depth"], "depth-at-best-ask"),
      priceToProbability("t-probability", ["price-is-probability"]),
      costOfTrade("t-cost", ["read-depth", "price-is-probability"]),
      {
        kind: "choice",
        id: "t-which-side",
        objectives: ["which-side"],
        prompt: "You hold contracts and want out immediately. What happens?",
        options: [
          "You sell at the ask",
          "You sell at the bid, receiving less than the ask",
          "You sell at the price you paid",
          "You must wait for a buyer",
        ],
        answerIndex: 1,
        explanation:
          "Selling immediately means hitting the bid. There is already a buyer — that is what the bid is — but they pay less than the ask, and that difference is the spread.",
      },
    ],
  },
};
