import { makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { walkTheBook } from "./generate";
import type { Chapter } from "./schema";

const TICK = 10;

/** Deliberately thin, so a market order of any size walks straight through it. */
const thinBook: Scenario = {
  id: "ch02-thin-book",
  seed: 21,
  tickSize: TICK,
  durationTicks: 80,
  startingCash: cents(100 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(540), qty: 6 },
    { side: "buy", price: ticks(520), qty: 14 },
    { side: "buy", price: ticks(500), qty: 40 },
    { side: "sell", price: ticks(600), qty: 5 },
    { side: "sell", price: ticks(620), qty: 12 },
    { side: "sell", price: ticks(660), qty: 35 },
  ],
  fairValue: wander(570, 5, 88),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 30, size: 6, refreshEvery: 6, widenPerFill: 10 }),
    makeNoiseTaker({ id: "noise", frequency: 0.35, minSize: 1, maxSize: 6 }),
  ],
};

/** A market that drifts away, so a resting limit order never gets hit. */
const driftingAway: Scenario = {
  ...thinBook,
  id: "ch02-drifting-away",
  seed: 22,
  durationTicks: 100,
  fairValue: wander(600, 7, 99),
};

export const chapter2: Chapter = {
  number: 2,
  slug: "orders-and-fills",
  title: "Orders & fills",
  teaches: "Limit versus market, who pays the spread, and where slippage comes from.",
  estimatedMinutes: 30,

  objectives: [
    { id: "limit-vs-market", statement: "Choose between a limit and a market order and predict the fill." },
    { id: "maker-taker", statement: "Explain who is the maker and who is the taker in a trade." },
    { id: "queue-priority", statement: "Explain queue priority and why a resting order may never fill." },
    { id: "average-price", statement: "Compute the average price of an order that walks the book." },
    { id: "slippage", statement: "Define slippage and predict when it will be large." },
  ],

  lessons: [
    {
      id: "two-kinds-of-order",
      title: "Two kinds of order",
      objectives: ["limit-vs-market"],
      defines: ["market order", "limit order"],
      points: [
        "A **market order** says: fill me now, at whatever price is there.",
        "A **limit order** says: fill me at this price or better, and wait if you have to.",
        "Market orders trade certainty of *price* for certainty of *execution*.",
        "Limit orders do the opposite — you name your price, and you might never trade.",
      ],
      body: [
        "You have two ways to ask for a trade, and they trade off against each other in a way you have to feel once before it sticks.",
        "A market order is impatient. It says: I want this now, fill me at whatever prices are sitting there. You will definitely trade. You just don't know exactly what you'll pay.",
        "A limit order is patient. It says: I'll pay up to this price and not a penny more. You know exactly what you'll pay — but you might sit there all day and never trade at all, because nobody came to meet you.",
        "Neither is the right answer. The question is always which uncertainty you'd rather carry: the price, or whether it happens.",
      ],
    },
    {
      id: "maker-and-taker",
      title: "Makers and takers",
      objectives: ["maker-taker"],
      defines: ["maker", "taker", "resting order"],
      points: [
        "A **resting order** is one sitting in the book, waiting.",
        "The **maker** is whoever was waiting. They made the liquidity.",
        "The **taker** is whoever crossed the spread to hit it. They took the liquidity.",
        "Every trade has exactly one of each. Venues often charge them differently.",
      ],
      body: [
        "Look at the book again. Every one of those numbers is somebody's resting order — an offer that is sitting there, waiting for a counterparty.",
        "When a trade happens, one side was waiting and one side came to them. The one who was waiting is called the maker, because their order made liquidity available. The one who crossed the spread to hit it is the taker, because they took that liquidity away.",
        "This distinction isn't academic. Most venues charge takers more than makers, and some pay makers. That difference turns out to matter enormously once you are trading often, and it is the reason some strategies exist at all.",
      ],
    },
    {
      id: "the-queue",
      title: "Standing in line",
      objectives: ["queue-priority"],
      defines: ["queue priority"],
      points: [
        "Several people can rest at the same price. They form a queue.",
        "**Queue priority** is the order they get filled in: earliest first.",
        "Join a price where 400 contracts already sit, and those 400 fill before you.",
        "If the market moves away before your turn, you never trade at all.",
      ],
      body: [
        "Prices are not single slots. Twenty people can all be bidding $0.58, and they are not all equal.",
        "They are in a queue, and the rule is simple: whoever got there first gets filled first. That is queue priority. If you join a price where 400 contracts are already resting, every one of those 400 has to trade before a single one of yours does.",
        "This is why a limit order can be right about the price and still lose. You were correct that the market would come down to $0.58 — it did, it traded 300 contracts there, and then it left. You were 400 deep in the queue. You got nothing.",
      ],
    },
    {
      id: "slippage",
      title: "Where slippage comes from",
      objectives: ["average-price", "slippage"],
      defines: ["slippage", "walking the book"],
      points: [
        "A market order too big for the best price keeps going to the next one.",
        "That is **walking the book** — each level you reach is worse than the last.",
        "Your **average price** is what you actually paid across all those levels.",
        "**Slippage** is the gap between the price you saw and the average you got.",
        "Thin book or big order? Expect more slippage.",
      ],
      body: [
        "Here is the thing that surprises people the first time. You see $0.60 on screen, you buy 50 contracts, and your average price comes back as $0.63.",
        "Nobody cheated you. There were only 5 contracts at $0.60. Your order took those, then took the 12 at $0.62, then reached up to $0.66 for the rest. That is walking the book, and your average price is the blend of everything you touched.",
        "The difference between the price you saw and the price you got is slippage. It is not a fee and nobody charges it — it is just what happens when your order is bigger than the offer in front of it.",
        "Two things make it worse: a thinner book, and a bigger order. Watch the order ticket as you change the size, and you can see it grow.",
      ],
    },
  ],

  drills: [
    walkTheBook("d2-walk", ["average-price", "slippage"]),
    {
      kind: "choice",
      id: "d2-which-order",
      objectives: ["limit-vs-market"],
      prompt:
        "You think $0.55 is a fair price and you are happy to wait days for it. The market is at $0.62. Which order?",
      options: [
        "A market order, to trade now",
        "A limit order to buy at $0.55",
        "A limit order to buy at $0.62",
        "Neither — you cannot trade below the market",
      ],
      answerIndex: 1,
      explanation:
        "A limit at $0.55 says exactly what you mean: buy if it comes down to me, otherwise wait. A market order would pay $0.62 right now, which is not the price you wanted.",
    },
    {
      kind: "choice",
      id: "d2-maker-taker",
      objectives: ["maker-taker"],
      prompt:
        "Your limit order has been resting in the book for an hour. Someone finally trades against it. What were you?",
      options: ["The taker", "The maker", "Both", "Neither — resting orders do not count"],
      answerIndex: 1,
      explanation:
        "You were waiting, so you made the liquidity — you are the maker. The person who crossed the spread to hit your order is the taker. Many venues charge them more than you.",
    },
    {
      kind: "choice",
      id: "d2-queue",
      objectives: ["queue-priority"],
      prompt:
        "You join the bid at $0.58 where 400 contracts already rest. The market trades 300 contracts at $0.58, then rallies away. What happened to your order?",
      options: [
        "It filled — you were at $0.58",
        "It partly filled",
        "Nothing filled; 400 were ahead of you",
        "It was cancelled automatically",
      ],
      answerIndex: 2,
      explanation:
        "Queue priority is earliest first. Only 300 of the 400 ahead of you traded, so your order never came up. You were right about the price and still got nothing.",
    },
    {
      kind: "choice",
      id: "d2-when-slippage",
      objectives: ["slippage"],
      prompt: "When should you expect the most slippage?",
      options: [
        "A small order in a deep book",
        "A large order in a thin book",
        "A limit order that rests",
        "Any order in a wide-spread market",
      ],
      answerIndex: 1,
      explanation:
        "Slippage comes from your order being bigger than the size resting at the best price. A big order in a thin book walks furthest up the book, so it blends in the worst prices.",
    },
  ],

  scenarios: [
    {
      id: "walk-it",
      scenario: thinBook,
      brief:
        "This book is deliberately thin. Set the size to 5, then 20, then 40, and watch the average fill and slippage in the ticket before you buy anything. Then buy 20 and compare what you paid to the price you saw.",
      objectives: ["average-price", "slippage"],
      success: [{ kind: "min-position", qty: 20, label: "Buy 20 and see what it cost" }],
    },
    {
      id: "patient-order",
      scenario: driftingAway,
      brief:
        "Try being patient instead. The market drifts, and an order that looks well-priced now may sit untouched. Watch how far the book moves while you wait.",
      objectives: ["limit-vs-market", "queue-priority"],
      success: [{ kind: "answer", questionId: "patient-check", label: "Notice the market move away" }],
    },
  ],

  test: {
    passThreshold: 0.8,
    drills: [
      walkTheBook("t2-walk", ["average-price", "slippage"]),
      walkTheBook("t2-walk-2", ["average-price"]),
      {
        kind: "choice",
        id: "t2-order-type",
        objectives: ["limit-vs-market"],
        prompt: "You must be filled before the market closes in one minute. Which order?",
        options: [
          "A limit order at the current bid",
          "A market order",
          "A limit order well below the market",
          "Wait and see",
        ],
        answerIndex: 1,
        explanation:
          "When execution matters more than price, a market order is the one that guarantees you trade. A limit order might never fill, and you have run out of time to find out.",
      },
      {
        kind: "choice",
        id: "t2-maker",
        objectives: ["maker-taker"],
        prompt: "Who pays the spread?",
        options: [
          "The maker, whose order was resting",
          "The taker, who crossed to trade now",
          "Both equally",
          "Whoever loses money on the trade",
        ],
        answerIndex: 1,
        explanation:
          "The taker crosses the spread to get filled immediately, so they pay it. The maker was patient and collects it — that is the compensation for waiting and for the risk of being wrong.",
      },
      {
        kind: "choice",
        id: "t2-queue-fill",
        objectives: ["queue-priority"],
        prompt: "Two orders rest at the same price. Which fills first?",
        options: [
          "The larger one",
          "The one that arrived first",
          "The smaller one",
          "They fill proportionally",
        ],
        answerIndex: 1,
        explanation:
          "Price first, then time. Among orders at the same price, the earliest arrival is filled first — which is why getting in early at a price is worth something.",
      },
    ],
  },
};
