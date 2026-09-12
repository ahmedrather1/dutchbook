import { makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { kalshi } from "@/lib/venues/kalshi";
import { polymarket } from "@/lib/venues/polymarket";
import { venueFee, walkTheBook } from "./generate";
import type { Chapter } from "./schema";

const TICK = 10;

/**
 * A book showing an apparent 2¢ edge that costs more than 2¢ to take. Taking it naively
 * ends the scenario down, which is the lesson.
 */
const expensiveEdge: Scenario = {
  id: "ch05-expensive-edge",
  seed: 51,
  tickSize: TICK,
  durationTicks: 90,
  startingCash: cents(100 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(490), qty: 8 },
    { side: "buy", price: ticks(470), qty: 25 },
    { side: "buy", price: ticks(440), qty: 60 },
    { side: "sell", price: ticks(510), qty: 8 },
    { side: "sell", price: ticks(530), qty: 25 },
    { side: "sell", price: ticks(560), qty: 60 },
  ],
  // Sits near 50c, where both venues' fees are at their most expensive.
  fairValue: wander(500, 4, 55),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 8, refreshEvery: 5, widenPerFill: 10 }),
    makeNoiseTaker({ id: "noise", frequency: 0.4, minSize: 2, maxSize: 8 }),
  ],
};

export const chapter5: Chapter = {
  number: 5,
  slug: "frictions",
  title: "Frictions",
  teaches: "Fees, spread, slippage, and lockup — why a paper edge dies in practice.",
  estimatedMinutes: 35,

  objectives: [
    { id: "compute-fee", statement: "Compute a venue's fee from its real formula." },
    { id: "fee-shape", statement: "Explain why fees peak at 50¢ and collapse at the extremes." },
    { id: "spread-cost", statement: "Count the spread against mid as a cost of trading." },
    { id: "all-in-cost", statement: "Add up the all-in cost of a trade before taking it." },
    { id: "break-even-edge", statement: "State the minimum gross edge a trade must clear." },
  ],

  lessons: [
    {
      id: "the-fee-curve",
      title: "The most expensive trade is a coin flip",
      objectives: ["compute-fee", "fee-shape"],
      defines: [],
      points: [
        "Both venues charge a fee shaped like price × (1 − price).",
        "Kalshi: `0.07 × contracts × P × (1 − P)`, rounded **up**.",
        "Polymarket: `contracts × rate × p × (1 − p)`, **takers only**.",
        "That curve peaks at $0.50 and falls to nearly nothing at $0.05 or $0.95.",
        "100 contracts at $0.50 costs $1.75 on Kalshi. The same at $0.10 costs $0.63.",
      ],
      body: [
        "Both venues charge you for trading, and both use a formula with the same distinctive shape.",
        "Kalshi's is 0.07 × contracts × price × (1 − price), rounded up to the next cent. Polymarket's is contracts × rate × price × (1 − price), where the rate depends on the category, and only takers pay it at all.",
        "The interesting part is the price × (1 − price) term. It is at its largest when the price is $0.50 and shrinks towards zero at both ends. So the closer a market is to a coin flip, the more it costs you to trade it.",
        "Put numbers on it. A hundred contracts at $0.50 costs $1.75 in fees on Kalshi. The same hundred at $0.10 costs $0.63. Nearly three times cheaper, for the identical size. This is not a detail — it decides which markets are worth trading at all.",
      ],
    },
    {
      id: "everything-else",
      title: "The costs nobody charges you",
      objectives: ["spread-cost", "all-in-cost"],
      defines: ["all-in cost"],
      points: [
        "The **fee** is the only cost anyone actually bills you for.",
        "The **spread** costs you half of it against mid, every time you cross.",
        "**Slippage** costs you whenever your order is bigger than the top of book.",
        "**Lockup** costs you the use of your money until resolution.",
        "**All-in cost** is the sum. Judge every trade against that, not against the fee.",
      ],
      body: [
        "Only one of your costs arrives as a line item. The rest are invisible unless you go looking, and together they usually dwarf the fee.",
        "Crossing the spread costs you roughly half of it against the midpoint — buy at the ask when mid is two cents lower, and you are two cents down before anything happens. Slippage costs you whenever your order is larger than the size at the best price. And the money is locked until the market resolves, which is a cost even when nothing goes wrong.",
        "Add them up and you get the all-in cost. The order ticket in this game shows you the itemised breakdown before you commit, and Chapter 6 onwards assumes you are reading it.",
      ],
    },
    {
      id: "break-even",
      title: "How much edge is enough?",
      objectives: ["break-even-edge", "all-in-cost"],
      defines: ["break-even edge"],
      points: [
        "**Break-even edge** = all-in cost ÷ contracts. Below it, a good-looking trade loses.",
        "Near $0.50 on a thin book, that can easily be 3–4¢ per contract.",
        "So a 2¢ edge is not an opportunity. It is a slow loss.",
        "Bigger orders raise the bar, because they walk further up the book.",
        "Before any trade: what is my edge, and what does it have to beat?",
      ],
      body: [
        "Here is the number that should stop you, and almost nobody computes it.",
        "Take the all-in cost of a trade and divide it by the number of contracts. That is your break-even edge — the gap between price and fair value that the trade must clear before it makes you a penny.",
        "Near $0.50 in a thin book it is routinely three or four cents a contract. Which means the 2¢ mispricing you just spotted is not an opportunity at all. Take it repeatedly and you will lose steadily while feeling clever.",
        "And it gets worse with size. A bigger order walks further up the book, so the bar rises exactly when you were most excited about the opportunity.",
        "From here to the end of the course, every apparent edge gets this test. Most fail it. Learning to say no quickly is most of what separates a profitable bot from a busy one.",
      ],
    },
  ],

  drills: [
    venueFee("d5-kalshi-fee", ["compute-fee"], kalshi),
    venueFee("d5-poly-fee", ["compute-fee"], polymarket),
    walkTheBook("d5-walk", ["all-in-cost"]),
    {
      kind: "choice",
      id: "d5-fee-peak",
      objectives: ["fee-shape"],
      prompt: "Which costs more in fees: 100 contracts at $0.50, or 100 at $0.90?",
      options: [
        "$0.50 — by roughly three times",
        "$0.90 — the higher price costs more",
        "Identical — the size is the same",
        "Depends on which side you take",
      ],
      answerIndex: 0,
      explanation:
        "Fees follow price × (1 − price). At $0.50 that term is 0.25; at $0.90 it is 0.09. Same size, nearly three times the cost. The closer to a coin flip, the dearer it is.",
    },
    {
      kind: "choice",
      id: "d5-hidden-costs",
      objectives: ["spread-cost"],
      prompt: "You buy at the ask and immediately sell at the bid, paying no fee at all. What happened?",
      options: [
        "You broke even",
        "You lost the spread",
        "You made the spread",
        "It depends on which way the price moved",
      ],
      answerIndex: 1,
      explanation:
        "You paid the ask and received the bid, so you are down by the spread having taken no view at all. Nobody billed you — that is what makes it easy to forget.",
    },
    {
      kind: "choice",
      id: "d5-break-even",
      objectives: ["break-even-edge"],
      prompt:
        "The all-in cost of your intended trade is 3.5¢ a contract. You have spotted a 2¢ mispricing. What now?",
      options: [
        "Take it — 2¢ is still an edge",
        "Take it in larger size to make it worthwhile",
        "Skip it; it loses 1.5¢ a contract",
        "Take it and hold to resolution to avoid the costs",
      ],
      answerIndex: 2,
      explanation:
        "The edge has to clear the costs, and 2¢ does not clear 3.5¢. Larger size makes it worse, because the order walks further. Holding longer does not refund the fee or the spread.",
    },
  ],

  scenarios: [
    {
      id: "the-trap",
      scenario: expensiveEdge,
      brief:
        "This market sits near $0.50, where fees are at their worst, and the book is thin. Use the ticket to price a trade of 5, then 25, then 60 contracts — read the slippage line each time — before you buy anything. Then decide whether any of them is worth doing.",
      objectives: ["all-in-cost", "break-even-edge", "spread-cost"],
      success: [
        { kind: "max-average-cost", ticks: 530, label: "Do not overpay for size you did not need" },
      ],
    },
  ],

  test: {
    passThreshold: 0.85,
    objectiveFloor: 0.6,
    drills: [
      venueFee("t5-kalshi-fee", ["compute-fee"], kalshi),
      venueFee("t5-poly-fee", ["compute-fee"], polymarket),
      walkTheBook("t5-walk", ["all-in-cost"]),
      {
        kind: "choice",
        id: "t5-shape",
        objectives: ["fee-shape"],
        prompt: "Why do both venues charge most at $0.50?",
        options: [
          "Coin flips are traded more often",
          "Both formulas contain price × (1 − price), which peaks there",
          "It discourages gambling",
          "Settlement is more expensive for close markets",
        ],
        answerIndex: 1,
        explanation:
          "It falls straight out of the arithmetic. price × (1 − price) is largest at 0.5 and approaches zero at both ends, so the fee does the same.",
      },
      {
        kind: "choice",
        id: "t5-all-in",
        objectives: ["all-in-cost", "spread-cost"],
        prompt: "Which of these is NOT a real cost of taking a trade?",
        options: [
          "The venue fee",
          "Half the spread against mid",
          "Slippage from walking the book",
          "The price moving against you afterwards",
        ],
        answerIndex: 3,
        explanation:
          "The first three are certain the moment you trade. The fourth is risk, not cost — it might go your way. Confusing the two is how people talk themselves into bad trades.",
      },
      {
        kind: "choice",
        id: "t5-size",
        objectives: ["break-even-edge"],
        prompt: "You double your order size in a thin book. What happens to the edge you need?",
        options: [
          "It halves — costs are spread over more contracts",
          "It stays the same",
          "It rises, because the order walks further up the book",
          "It depends on the fee rate only",
        ],
        answerIndex: 2,
        explanation:
          "Fees scale with size, but slippage scales worse than linearly once you exhaust the top of book. Bigger orders need more edge, not less.",
      },
    ],
  },
};
