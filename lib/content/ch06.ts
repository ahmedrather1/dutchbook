import { flat, makeMarketMaker, makeNoiseTaker } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { dutchBookNet, spotDutchBook } from "./arbGenerate";
import type { Chapter } from "./schema";

const TICK = 10;

/**
 * A market whose complement is mispriced: YES and NO together cost under $1 for a
 * limited window, then the maker widens and it closes.
 */
const arbWindow: Scenario = {
  id: "ch06-arb-window",
  seed: 61,
  tickSize: TICK,
  durationTicks: 90,
  startingCash: cents(200 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(380), qty: 30 },
    { side: "buy", price: ticks(360), qty: 70 },
    { side: "sell", price: ticks(420), qty: 25 },
    { side: "sell", price: ticks(450), qty: 70 },
  ],
  fairValue: flat(400),
  agents: () => [
    // Widens hard once taken, so a slow player watches the window shut.
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 25, refreshEvery: 6, widenPerFill: 25 }),
    makeNoiseTaker({ id: "noise", frequency: 0.3, minSize: 2, maxSize: 8 }),
  ],
};

/** Same shape, but priced so fees eat the whole gross edge. */
const feeTrap: Scenario = {
  ...arbWindow,
  id: "ch06-fee-trap",
  seed: 62,
  fairValue: flat(500),
  initialBook: [
    { side: "buy", price: ticks(480), qty: 40 },
    { side: "sell", price: ticks(505), qty: 40 },
    { side: "sell", price: ticks(520), qty: 90 },
  ],
};

export const chapter6: Chapter = {
  number: 6,
  slug: "arb-dutch-book",
  title: "ARB I — Dutch book",
  teaches: "Buying YES and NO together for under $1, and when that is a trap.",
  estimatedMinutes: 40,

  objectives: [
    { id: "spot-dutch-book", statement: "Recognise when YES and NO together cost less than $1." },
    { id: "size-the-arb", statement: "Size the trade against the depth available on both sides." },
    { id: "use-merge", statement: "Use merge to realise the profit immediately instead of waiting." },
    { id: "fee-trap", statement: "Reject an arb whose gross edge does not survive fees." },
    { id: "depth-trap", statement: "Reject an arb where one side is far thinner than the other." },
  ],

  lessons: [
    {
      id: "the-free-money",
      title: "When the two sides disagree",
      objectives: ["spot-dutch-book"],
      defines: ["Dutch book", "arbitrage"],
      points: [
        "You know YES + NO = $1.00. Exactly one of them pays.",
        "So if you can buy **both** for less than $1.00, you have locked a profit.",
        "It does not matter how the event resolves. You hold the winner either way.",
        "That is a **Dutch book** — the simplest kind of **arbitrage**.",
        "YES at $0.55 and NO at $0.42 sum to $0.97. Buy both: guaranteed 3¢.",
      ],
      body: [
        "This is the chapter the whole course has been walking towards, and the idea is almost insultingly simple once you see it.",
        "One of YES and NO pays $1.00. Always, guaranteed, by the construction of the contract. So if the market will sell you both for a combined 97¢, you have bought a certain dollar for 97 cents.",
        "Notice what is missing: any opinion. You do not need to know whether the event happens. You do not need a model, a view, or an edge in forecasting. You hold both sides, one of them wins, and the difference is yours regardless.",
        "That is a Dutch book, and it is the purest form of arbitrage there is. The rest of this chapter is about why it is harder than it looks.",
      ],
    },
    {
      id: "taking-it",
      title: "Collecting it early",
      objectives: ["use-merge", "size-the-arb"],
      defines: ["merge"],
      points: [
        "Hold both to resolution and you get your $1.00 — but that could be months.",
        "**Merge** turns one YES and one NO straight back into $1.00, any time.",
        "So the profit is available now, and your capital is freed to go again.",
        "Polymarket supports merge. Kalshi, as modelled here, does not.",
        "Size is capped by the **thinner** side: 200 YES and 12 NO is a 12-pair trade.",
      ],
      body: [
        "You have bought both sides for 97¢. Now what?",
        "The patient answer is to wait for resolution, collect your $1.00, and bank 3¢. That works, but your money is tied up until the event actually happens — possibly months — for a 3% return you cannot compound.",
        "Merge is the better answer. It converts a YES and a NO back into $1.00 of collateral immediately, because that pair is worth exactly $1.00 by definition. You take the 3¢ now and your capital is free to find the next one. This is what makes arbitrage a business rather than a series of long bets.",
        "One constraint dominates everything: you need both sides, so the trade is capped by whichever side is thinner. Two hundred YES available and twelve NO means you are doing a twelve-pair trade, no matter how good the price looks.",
      ],
    },
    {
      id: "the-traps",
      title: "Why it is usually not there",
      objectives: ["fee-trap", "depth-trap"],
      defines: [],
      points: [
        "You pay a fee on **both** legs, and both are near the middle where fees peak.",
        "A 2¢ gross edge on a near-coin-flip is routinely negative after fees.",
        "Thin depth means the real profit is tiny even when the percentage looks good.",
        "3¢ a pair on 8 pairs is 24¢, before you have paid anything.",
        "Most apparent Dutch books are one of these two. The skill is saying no fast.",
      ],
      body: [
        "If this were as easy as the first lesson implies, it would not exist. Two things kill most of them.",
        "The first is fees. You are doing two trades, not one, so you pay twice — and a Dutch book most often appears on markets priced near the middle, exactly where both venues charge the most. Chapter 5's arithmetic applies with full force: a 2¢ gross edge on a pair near 50¢ is frequently a loss once both legs are paid for.",
        "The second is depth. The percentage return looks the same whether you can do eight pairs or eight thousand, but the money does not. Three cents a pair on eight pairs is twenty-four cents. You will spend more than that in attention.",
        "So the real skill in this chapter is not spotting them. It is rejecting them quickly, so you are still watching when a real one appears.",
      ],
    },
  ],

  drills: [
    spotDutchBook("d6-spot", ["spot-dutch-book"]),
    spotDutchBook("d6-spot-2", ["spot-dutch-book"]),
    dutchBookNet("d6-net", ["fee-trap"]),
    {
      kind: "choice",
      id: "d6-depth",
      objectives: ["size-the-arb", "depth-trap"],
      prompt:
        "YES is offered at $0.55 for 400 contracts, NO at $0.42 for 9 contracts. How many pairs can you do?",
      options: ["400", "409", "9", "200"],
      answerIndex: 2,
      explanation:
        "You need one of each, so the thinner side caps you at 9 pairs. That is 3¢ × 9 = 27¢ of gross profit — before two legs of fees. Almost certainly not worth doing.",
    },
    {
      kind: "choice",
      id: "d6-merge",
      objectives: ["use-merge"],
      prompt: "You hold 50 YES and 50 NO on the same market, bought for $0.96 the pair. Why merge?",
      options: [
        "It increases the profit",
        "It realises the profit now and frees the capital",
        "It is required before resolution",
        "It avoids the resolution outcome",
      ],
      answerIndex: 1,
      explanation:
        "The profit is the same either way — the pair is worth exactly $1.00. Merging just gets it now instead of at resolution, so your capital can go and do it again.",
    },
    {
      kind: "choice",
      id: "d6-no-view",
      objectives: ["spot-dutch-book"],
      prompt: "What view about the event do you need to hold to take a Dutch book?",
      options: [
        "That it is more likely than the market thinks",
        "That it is less likely than the market thinks",
        "None at all",
        "That it will resolve before your capital is needed",
      ],
      answerIndex: 2,
      explanation:
        "None. You hold both sides, so one of them pays whatever happens. That independence from any forecast is exactly what makes it arbitrage rather than a bet.",
    },
  ],

  scenarios: [
    {
      id: "take-the-window",
      scenario: arbWindow,
      brief:
        "The complement here is mispriced, and the maker widens once it has been taken. Work out what YES and NO cost together, check the depth on both sides, and act before the window closes.",
      objectives: ["spot-dutch-book", "size-the-arb"],
      success: [
        { kind: "min-position", qty: 20, label: "Take the arb at meaningful size" },
        { kind: "min-realised", cents: 1, label: "Finish ahead" },
      ],
    },
    {
      id: "the-fee-trap",
      scenario: feeTrap,
      brief:
        "Another apparent edge, this time sitting right at $0.50 where fees are at their worst. Price it in the ticket before you touch it. The right answer here may well be to do nothing at all.",
      objectives: ["fee-trap", "depth-trap"],
      success: [
        { kind: "max-average-cost", ticks: 510, label: "Do not overpay for a fake edge" },
      ],
    },
  ],

  test: {
    passThreshold: 0.85,
    objectiveFloor: 0.6,
    drills: [
      spotDutchBook("t6-spot", ["spot-dutch-book"]),
      spotDutchBook("t6-spot-2", ["spot-dutch-book"]),
      dutchBookNet("t6-net", ["fee-trap"]),
      dutchBookNet("t6-net-2", ["fee-trap"]),
      {
        kind: "choice",
        id: "t6-size",
        objectives: ["size-the-arb", "depth-trap"],
        prompt: "What caps the size of a Dutch book trade?",
        options: [
          "Your available cash",
          "The thinner of the two sides",
          "The venue's order limit",
          "The wider of the two spreads",
        ],
        answerIndex: 1,
        explanation:
          "You must buy both sides, so whichever has less size available decides the trade. Cash matters too, but depth is what usually binds — and what makes most of these not worth doing.",
      },
      {
        kind: "choice",
        id: "t6-merge-venue",
        objectives: ["use-merge"],
        prompt: "Which venue in this game lets you merge YES and NO back into $1.00?",
        options: ["Kalshi", "Polymarket", "Both", "Neither"],
        answerIndex: 1,
        explanation:
          "Merge is a Polymarket mechanic. On Kalshi as modelled here you hold the pair to resolution instead, which ties up your capital for however long that takes.",
      },
    ],
  },
};
