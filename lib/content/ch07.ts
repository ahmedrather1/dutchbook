import { flat, jump, makeMarketMaker, makeNoiseTaker } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { crossVenue, spotDutchBook } from "./arbGenerate";
import type { Chapter } from "./schema";

const TICK = 10;

/** One venue reprices while the other lags, opening a cross-venue gap. */
const twoVenues: Scenario = {
  id: "ch07-two-venues",
  seed: 71,
  tickSize: TICK,
  durationTicks: 100,
  startingCash: cents(200 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(540), qty: 40 },
    { side: "buy", price: ticks(520), qty: 90 },
    { side: "sell", price: ticks(580), qty: 30 },
    { side: "sell", price: ticks(610), qty: 80 },
  ],
  fairValue: jump(560, 680, 35),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 25, size: 30, refreshEvery: 7, widenPerFill: 15 }),
    makeNoiseTaker({ id: "noise", frequency: 0.35, minSize: 2, maxSize: 10 }),
  ],
};

/** The second leg disappears fast, so the player experiences a stranded leg. */
const strandedLeg: Scenario = {
  ...twoVenues,
  id: "ch07-stranded-leg",
  seed: 72,
  durationTicks: 80,
  fairValue: flat(600),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 12, refreshEvery: 3, widenPerFill: 40 }),
    makeNoiseTaker({ id: "fast", frequency: 0.8, minSize: 5, maxSize: 18 }),
  ],
};

export const chapter7: Chapter = {
  number: 7,
  slug: "arb-cross-venue",
  title: "ARB II — Cross-venue",
  teaches: "The same event priced differently on two venues, and the risk of half a trade.",
  estimatedMinutes: 40,

  objectives: [
    { id: "same-event", statement: "Recognise when two venues are pricing the same event." },
    { id: "normalise", statement: "Compare two venues' prices after normalising fees and units." },
    { id: "leg-risk", statement: "Explain leg risk and what a stranded leg leaves you holding." },
    { id: "sequencing", statement: "Decide which leg to send first and why." },
    { id: "cross-net", statement: "Compute the net edge of a cross-venue trade." },
  ],

  lessons: [
    {
      id: "same-event-two-prices",
      title: "One event, two prices",
      objectives: ["same-event", "normalise"],
      defines: ["cross-venue arbitrage"],
      points: [
        "The same real-world question is often listed on both venues at once.",
        "They are separate markets with separate books, so prices can drift apart.",
        "Buy YES on the cheap venue, NO on the other. One pays $1.00 regardless.",
        "Under $1.00 combined is **cross-venue arbitrage**.",
        "First check they really are the same question. Wording matters enormously.",
      ],
      body: [
        "Chapter 6 found a mispriced complement inside one book. This chapter finds it across two.",
        "The same election, the same match, the same economic number gets listed on both venues. They are entirely separate order books with separate participants, so nothing forces their prices to agree. When they drift, you can buy YES where it is cheap and NO where it is cheap, and you are holding a guaranteed dollar for less than a dollar — exactly the Chapter 6 trade, spread across two venues.",
        "Before anything else, check the two markets really ask the same question. 'Will X win the election' and 'Will X be inaugurated' are not the same question, and the difference will not show up in the price until it costs you everything.",
      ],
    },
    {
      id: "leg-risk",
      title: "The half-done trade",
      objectives: ["leg-risk"],
      defines: ["leg", "leg risk"],
      points: [
        "Each side of the trade is a **leg**. You need both for the profit to be locked.",
        "Two venues means two orders that cannot be sent atomically.",
        "Fill one, miss the other, and you hold a naked directional bet you never wanted.",
        "That is **leg risk**, and it is what makes this harder than Chapter 6.",
        "A stranded leg must be managed out — usually at a loss.",
      ],
      body: [
        "Here is what makes cross-venue genuinely harder, and it is not the arithmetic.",
        "Inside one venue you can often get both sides effectively together. Across two, you are sending two orders to two different systems, and there is no mechanism that makes them succeed or fail as one. You will sometimes get one and not the other.",
        "When that happens you are not flat and you are not arbitraged. You are holding a one-sided bet on an event you deliberately had no opinion about. That is leg risk, and it is the reason cross-venue arbitrage pays better than the single-venue kind: you are being compensated for it.",
        "The stranded leg then has to be dealt with. Chase the second venue at a worse price and give back the edge, or unwind the first and pay the spread twice. Both hurt. The skill is making it happen rarely.",
      ],
    },
    {
      id: "sequencing",
      title: "Which order goes first",
      objectives: ["sequencing", "cross-net"],
      defines: [],
      points: [
        "Send the **harder** leg first — the thinner, slower, or more contested one.",
        "If it misses, you have not traded at all, which costs nothing.",
        "Send the easy leg first and you are exposed while waiting on the hard one.",
        "Size to the thinner side, as always.",
        "Net edge = combined price − $1.00, minus both venues' fees.",
      ],
      body: [
        "If you must send two orders, the order you send them in is a real decision.",
        "Send the difficult leg first: the thinner book, the slower venue, the one others are competing for. If it fills, the easy leg is very likely to fill too and you are done. If it misses, you have not traded at all — no position, no loss, nothing to unwind.",
        "Do it the other way and you have guaranteed yourself exposure exactly when the remaining leg is the one likely to fail. This single ordering choice is most of what separates a cross-venue bot that works from one that bleeds.",
        "As for whether it is worth doing at all: add both prices, subtract from $1.00, then subtract both venues' fees. Remember Polymarket charges takers only, so resting a leg there can cost nothing at all — a real advantage when you have time.",
      ],
    },
  ],

  drills: [
    crossVenue("d7-cross", ["cross-net", "normalise"]),
    crossVenue("d7-cross-2", ["cross-net"]),
    spotDutchBook("d7-spot", ["same-event"]),
    {
      kind: "choice",
      id: "d7-stranded",
      objectives: ["leg-risk"],
      prompt:
        "You buy YES on Kalshi, but your Polymarket NO order misses. What do you now hold?",
      options: [
        "A locked-in arbitrage",
        "Nothing — the trade failed",
        "A one-sided bet that the event happens",
        "A hedged position at a worse price",
      ],
      answerIndex: 2,
      explanation:
        "One leg is a directional position. You now need the event to happen, which is precisely the opinion you were trying not to have. That is leg risk arriving.",
    },
    {
      kind: "choice",
      id: "d7-sequence",
      objectives: ["sequencing"],
      prompt:
        "One leg is on a deep, fast book; the other is thin and contested. Which do you send first?",
      options: [
        "The deep one — it is more certain to fill",
        "The thin one — if it misses, you have not traded at all",
        "Both at the same instant",
        "Whichever is cheaper",
      ],
      answerIndex: 1,
      explanation:
        "Send the leg most likely to fail first. A miss then costs nothing. Fill the easy leg first and you are exposed exactly while waiting on the one that might not come.",
    },
    {
      kind: "choice",
      id: "d7-same-question",
      objectives: ["same-event"],
      prompt:
        "Two venues list markets that look identical but resolve on different sources. What is the risk?",
      options: [
        "They will have different spreads",
        "They can resolve differently, leaving you holding two losers",
        "Fees will differ",
        "No risk — the event is the same",
      ],
      answerIndex: 1,
      explanation:
        "If the resolution criteria differ, your 'guaranteed' pair is not guaranteed. Both can settle against you. Always read how each side resolves before treating them as complements.",
    },
  ],

  scenarios: [
    {
      id: "cross-venue-window",
      scenario: twoVenues,
      brief:
        "News hits mid-run and this book reprices. Treat the lagging quote as the second venue: work out whether the pair is under $1.00, and act before the maker catches up.",
      objectives: ["same-event", "cross-net"],
      success: [
        { kind: "min-position", qty: 15, label: "Act on the gap" },
        { kind: "min-realised", cents: 1, label: "Finish ahead" },
      ],
    },
    {
      id: "stranded",
      scenario: strandedLeg,
      brief:
        "The book here is thin and fast, and other traders are competing for it. Try to build a position of 30 and notice how often you get part of what you asked for. Then manage your way back to flat.",
      objectives: ["leg-risk", "sequencing"],
      success: [{ kind: "no-unhedged-leg", label: "Do not end up holding a one-sided bet" }],
    },
  ],

  test: {
    passThreshold: 0.85,
    objectiveFloor: 0.6,
    drills: [
      crossVenue("t7-cross", ["cross-net"]),
      crossVenue("t7-cross-2", ["normalise"]),
      {
        kind: "choice",
        id: "t7-leg-risk",
        objectives: ["leg-risk"],
        prompt: "Why does cross-venue arbitrage usually pay more than the single-venue kind?",
        options: [
          "The spreads are wider",
          "You are being paid for leg risk",
          "Fees are lower across two venues",
          "There is more depth available",
        ],
        answerIndex: 1,
        explanation:
          "Two orders to two systems cannot be made atomic, so you carry the risk of ending up with one. The extra edge is the compensation for that risk.",
      },
      {
        kind: "choice",
        id: "t7-sequencing",
        objectives: ["sequencing"],
        prompt: "Your first leg fills and the second is now 4¢ worse. What is the least bad option?",
        options: [
          "Take the worse price and lock a smaller profit or small loss",
          "Hold the single leg and hope",
          "Double the first leg to average down",
          "Wait for the original price to return",
        ],
        answerIndex: 0,
        explanation:
          "Completing the trade at a worse price caps the damage. Holding the single leg keeps a directional bet you never wanted, and adding to it makes that bet bigger.",
      },
      {
        kind: "choice",
        id: "t7-same-event",
        objectives: ["same-event"],
        prompt: "What must you verify before treating two venues' markets as complements?",
        options: [
          "That they have similar volume",
          "That they resolve on the same criteria",
          "That they have the same tick size",
          "That they close at the same time",
        ],
        answerIndex: 1,
        explanation:
          "Everything else is a cost or an inconvenience. Different resolution criteria mean the two can both settle against you, which turns a 'riskless' pair into a double loss.",
      },
    ],
  },
};
