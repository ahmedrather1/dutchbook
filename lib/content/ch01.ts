import { flat, makeMarketMaker, makeNoiseTaker } from "@/lib/engine/agents";
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
    { side: "buy", price: ticks(580), qty: 40 },
    { side: "buy", price: ticks(570), qty: 80 },
    { side: "sell", price: ticks(640), qty: 35 },
    { side: "sell", price: ticks(650), qty: 90 },
  ],
  fairValue: flat(610),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 30, size: 40, refreshEvery: 10 }),
    makeNoiseTaker({ id: "noise", frequency: 0.12, minSize: 1, maxSize: 5 }),
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
      body: [
        "Every market is two lists of intentions. One list is people willing to buy, and the price each of them will pay. The other is people willing to sell, and the price each will accept. Together the two lists are called the order book.",
        "The highest price anyone will buy at is the bid. The lowest price anyone will sell at is the ask. Those two numbers are the only prices you can actually trade at right now.",
        "This has a consequence people find surprising at first: there is no single price. If you want to buy immediately, you pay the ask. If you want to sell immediately, you receive the bid. You trade against the opposite side from the one you are on.",
      ],
    },
    {
      id: "the-spread",
      title: "The gap between them is a cost",
      objectives: ["read-spread"],
      defines: ["spread"],
      body: [
        "The bid is always below the ask. The gap between them is the spread.",
        "The spread matters because of what happens if you buy and immediately sell again. You paid the ask, you received the bid, and you are down by the spread having done nothing at all.",
        "That is not a fee anyone charged you. It is the price of wanting to trade right now instead of waiting. Later chapters count it as a real cost, because it is one.",
      ],
    },
    {
      id: "depth",
      title: "A price is only good for so much size",
      objectives: ["read-depth"],
      defines: ["depth", "size"],
      body: [
        "Next to each price is a quantity: how many contracts are available there. This is called depth.",
        "The best ask might be $0.64 for 35 contracts. If you want 100, you get 35 at $0.64 and the rest at worse prices further up the book.",
        "So a price you see on screen is a promise about a specific amount, not about any amount. An opportunity that exists for 10 contracts and not for 10,000 is a completely different opportunity.",
      ],
    },
    {
      id: "price-is-probability",
      title: "The price is the probability",
      objectives: ["price-is-probability"],
      defines: ["binary contract", "settle"],
      body: [
        "In a prediction market, a contract pays exactly $1.00 if some event happens, and exactly $0.00 if it does not. That is called a binary contract, and paying out is called settling.",
        "So ask what a contract trading at $0.62 is worth. If you think the event is certain, it is worth $1.00 and $0.62 is cheap. If you think it will never happen, it is worth nothing and $0.62 is madness.",
        "The price where buyers and sellers stop disagreeing is the market's collective estimate of how likely the event is. $0.62 means the market thinks 62%. The price and the probability are the same number.",
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
        "A slow market. Nothing is being asked of you except to watch. Find the best bid, the best ask, and the spread, and notice how they move as trades come through.",
      objectives: ["read-bid-ask", "read-spread", "read-depth"],
      success: [{ kind: "answer", questionId: "read-only-check", label: "Read the book correctly" }],
    },
    {
      id: "first-trade",
      scenario: firstTrade,
      brief:
        "Now buy 10 contracts. Before you do, predict which price you will get. Then check what you actually paid.",
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
