import { flat, makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { multiOutcomeSum } from "./arbGenerate";
import type { Chapter } from "./schema";

const TICK = 10;

const driftingSet: Scenario = {
  id: "ch08-drifting-set",
  seed: 81,
  tickSize: TICK,
  durationTicks: 110,
  startingCash: cents(200 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(300), qty: 40 },
    { side: "buy", price: ticks(280), qty: 90 },
    { side: "sell", price: ticks(330), qty: 35 },
    { side: "sell", price: ticks(360), qty: 90 },
  ],
  fairValue: wander(320, 7, 82),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 30, refreshEvery: 5, widenPerFill: 12 }),
    makeNoiseTaker({ id: "noise", frequency: 0.4, minSize: 3, maxSize: 12 }),
  ],
};

const correlationTrap: Scenario = {
  ...driftingSet,
  id: "ch08-correlation-trap",
  seed: 82,
  fairValue: flat(450),
};

export const chapter8: Chapter = {
  number: 8,
  slug: "arb-logical",
  title: "ARB III — Logical & correlated",
  teaches: "Mutually exclusive sets, conditional consistency, and the trap of mere correlation.",
  estimatedMinutes: 45,

  objectives: [
    { id: "sum-the-set", statement: "Detect when a set of mutually exclusive outcomes sums below $1." },
    { id: "conditional", statement: "Spot a conditional inconsistency between related markets." },
    { id: "guarantee-vs-correlation", statement: "Tell a logical guarantee apart from a mere correlation." },
    { id: "negative-risk", statement: "Explain how negative risk changes multi-outcome arithmetic." },
    { id: "set-sizing", statement: "Size a multi-outcome trade against the thinnest leg." },
  ],

  lessons: [
    {
      id: "the-whole-set",
      title: "Buying every outcome",
      objectives: ["sum-the-set", "set-sizing"],
      defines: ["mutually exclusive", "outcome set"],
      points: [
        "Some events have several outcomes where exactly one can happen.",
        "That is a **mutually exclusive** **outcome set** — one winner, guaranteed.",
        "So the whole set is worth exactly $1.00, just like YES and NO.",
        "Buy every outcome for less than $1.00 combined and you have locked a profit.",
        "Four candidates at 40¢, 30¢, 20¢ and 5¢ sum to 95¢. That is 5¢ free.",
      ],
      body: [
        "Chapter 6 worked because YES and NO are exhaustive: one of them must pay. That logic does not stop at two.",
        "An election with four candidates where exactly one wins behaves identically. Whatever happens, exactly one of those four contracts pays $1.00 and the rest pay nothing. So the whole set is worth exactly $1.00.",
        "Which means if you can buy all four for a combined 95¢, you have bought a guaranteed dollar for 95 cents. Same trade as Chapter 6, more legs.",
        "More legs is the catch. Every leg costs a fee, every leg can be thin, and the whole thing is capped by whichever outcome has the least size available. A five-cent edge across four legs near the middle of the price range is frequently not there once you have paid for all four.",
      ],
    },
    {
      id: "conditionals",
      title: "Markets that must agree",
      objectives: ["conditional"],
      defines: ["conditional inconsistency"],
      points: [
        "Some markets are logically linked even without being one set.",
        "Winning the tournament **requires** reaching the final.",
        "So 'wins tournament' can never be worth more than 'reaches final'.",
        "Priced the other way round, that is a **conditional inconsistency**.",
        "Buy the cheap one, sell the dear one: the logic cannot break.",
      ],
      body: [
        "Beyond exhaustive sets there are markets bound together by plain logic.",
        "A team cannot win the tournament without reaching the final. So 'wins the tournament' is a subset of 'reaches the final', and it can never be more likely. If the market prices 'wins' at 35¢ and 'reaches final' at 30¢, something is wrong — and it is wrong in a way that cannot be fixed by events.",
        "You buy the underpriced 'reaches final' and sell the overpriced 'wins'. Every path the world can take leaves you at worst flat and usually ahead. That is a real arbitrage, resting on nothing but the structure of the question.",
        "These are rarer than the sum-the-set kind and much easier to miss, because you have to notice the relationship yourself. Nobody labels them.",
      ],
    },
    {
      id: "the-big-trap",
      title: "Guarantee or just correlation?",
      objectives: ["guarantee-vs-correlation"],
      defines: ["correlation"],
      points: [
        "This is the most important distinction in the chapter. Slow down.",
        "A **guarantee** holds by logic, on every possible path. It cannot break.",
        "A **correlation** usually holds. Usually is not a guarantee.",
        "'Wins tournament' ≤ 'reaches final' is a guarantee.",
        "'Wins tournament' ≈ 'top scorer plays' is a correlation. It can break.",
        "Trading a correlation as if it were a guarantee is how people blow up.",
      ],
      body: [
        "Here is the distinction this chapter really exists to teach, and it is the one that costs people the most money.",
        "A logical guarantee holds on every path the world can take. Winning the tournament requires reaching the final — there is no sequence of events where that fails. You can size that trade like an arbitrage, because it is one.",
        "A correlation is a relationship that usually holds. Two markets that have moved together for months. An outcome that nearly always follows another. These look identical on a screen, and they are completely different animals. Correlations break, and they break exactly when things get strange, which is exactly when you have the most on.",
        "So before sizing anything here, ask one question: is there a path, however unlikely, where this relationship fails? If yes, it is a bet. It may be a good bet. But it is not arbitrage, and it must not be sized like one.",
        "This game scores you accordingly. Taking a merely-correlated trade counts as a failure in this chapter even when it happens to make money — because the process was wrong and the next one will not be so kind.",
      ],
    },
    {
      id: "negative-risk",
      title: "Negative risk",
      objectives: ["negative-risk"],
      defines: ["negative risk"],
      points: [
        "Polymarket has a mechanic called **negative risk** for winner-take-all sets.",
        "One NO on any outcome converts into one YES on **every other** outcome.",
        "Hold NO on 'Other' in a three-way race → get YES on both remaining names.",
        "It makes betting against an outcome far cheaper in capital.",
        "It also changes the arithmetic of which multi-outcome trades are worth doing.",
      ],
      body: [
        "Polymarket adds a mechanic to winner-take-all sets that is worth understanding before you compute any multi-outcome edge.",
        "Ordinarily, betting against one candidate means buying NO on that candidate, or buying YES on every rival — which ties up a lot of capital. Negative risk collapses the difference: one NO share on any outcome converts atomically into one YES share on every other outcome in the set.",
        "The two positions are logically identical, since exactly one outcome wins. The mechanic just lets you hold whichever form is cheaper and convert when it suits you. For a bot, that means the cheapest route into a position may not be the obvious one, and the arithmetic of a set arb has to account for it.",
      ],
    },
  ],

  drills: [
    multiOutcomeSum("d8-sum", ["sum-the-set"]),
    multiOutcomeSum("d8-sum-2", ["sum-the-set"]),
    {
      kind: "choice",
      id: "d8-conditional",
      objectives: ["conditional"],
      prompt:
        "'Team A wins the tournament' trades at $0.35. 'Team A reaches the final' trades at $0.30. What is true?",
      options: [
        "The market expects an upset",
        "It is inconsistent — winning requires reaching the final",
        "It is fine; they are separate markets",
        "It means A is likely to lose the final",
      ],
      answerIndex: 1,
      explanation:
        "Winning is a subset of reaching the final, so it can never be more likely. Buy 'reaches final' and sell 'wins' — no sequence of events can make you lose on the relationship.",
    },
    {
      kind: "choice",
      id: "d8-correlation",
      objectives: ["guarantee-vs-correlation"],
      prompt:
        "Two markets have moved almost in lockstep for six months. Is that an arbitrage opportunity when they diverge?",
      options: [
        "Yes — they always converge",
        "No — a historical relationship is not a logical guarantee",
        "Yes, if the correlation is above 0.9",
        "Only if they resolve on the same date",
      ],
      answerIndex: 1,
      explanation:
        "Nothing forces them back together. A correlation that has held for six months can break on the seventh, and it will tend to break precisely when you are largest. That is a bet, not an arb.",
    },
    {
      kind: "choice",
      id: "d8-neg-risk",
      objectives: ["negative-risk"],
      prompt: "In a four-outcome negative-risk market, one NO share converts into what?",
      options: [
        "One YES share on the same outcome",
        "One YES share on each of the other three outcomes",
        "Four YES shares on the same outcome",
        "$1.00 of collateral",
      ],
      answerIndex: 1,
      explanation:
        "NO on one outcome means one of the other three must win, which is exactly what holding YES on all three gives you. The mechanic makes that equivalence tradable.",
    },
    {
      kind: "choice",
      id: "d8-set-size",
      objectives: ["set-sizing"],
      prompt:
        "A four-outcome set sums to $0.94, but one outcome has only 6 contracts offered. What size is the trade?",
      options: ["6 sets", "24 sets", "As much as your cash allows", "Depends on the other three"],
      answerIndex: 0,
      explanation:
        "You need one of every outcome, so the thinnest leg caps you at 6 sets. That is 6¢ × 6 = 36¢ gross, across four legs of fees. Almost certainly not worth doing.",
    },
  ],

  scenarios: [
    {
      id: "watch-the-set",
      scenario: driftingSet,
      brief:
        "This is one outcome of a mutually exclusive set that drifts over time. Watch for the moment it is cheap enough that the whole set would sum below $1.00, and take it then.",
      objectives: ["sum-the-set", "set-sizing"],
      success: [
        { kind: "min-position", qty: 15, label: "Take the set when it is genuinely cheap" },
        { kind: "min-realised", cents: 1, label: "Finish ahead" },
      ],
    },
    {
      id: "decline-the-correlation",
      scenario: correlationTrap,
      brief:
        "This market looks related to one you have been watching, but nothing logically binds them. The right answer is to leave it alone. Sitting on your hands is a real skill and it is being scored here.",
      objectives: ["guarantee-vs-correlation"],
      success: [{ kind: "max-average-cost", ticks: 10, label: "Decline a trade that is not an arb" }],
    },
  ],

  test: {
    passThreshold: 0.85,
    objectiveFloor: 0.6,
    drills: [
      multiOutcomeSum("t8-sum", ["sum-the-set"]),
      multiOutcomeSum("t8-sum-2", ["sum-the-set"]),
      {
        kind: "choice",
        id: "t8-guarantee",
        objectives: ["guarantee-vs-correlation"],
        prompt: "Which of these can be sized as an arbitrage?",
        options: [
          "Two markets that have tracked each other closely all year",
          "'Reaches the final' priced below 'wins the tournament'",
          "A market that looks mispriced against your model",
          "Two markets on similar events by the same issuer",
        ],
        answerIndex: 1,
        explanation:
          "Only the second holds on every possible path — winning requires reaching the final. The others are relationships that usually hold, which is a different and much more dangerous thing.",
      },
      {
        kind: "choice",
        id: "t8-conditional",
        objectives: ["conditional"],
        prompt: "Market A is logically contained in market B. What must be true of their prices?",
        options: [
          "A must price above B",
          "A must price at or below B",
          "They must be equal",
          "Nothing — they are independent",
        ],
        answerIndex: 1,
        explanation:
          "If A can only happen when B happens, A cannot be more likely than B. Priced otherwise, the pair is inconsistent and the inconsistency is tradable.",
      },
      {
        kind: "choice",
        id: "t8-neg-risk",
        objectives: ["negative-risk"],
        prompt: "What problem does negative risk solve?",
        options: [
          "Fees on multi-outcome markets",
          "The capital cost of betting against an outcome",
          "Resolution disputes",
          "Thin order books",
        ],
        answerIndex: 1,
        explanation:
          "Betting against an outcome otherwise means buying YES on every rival, which ties up capital in proportion to the number of outcomes. Conversion makes the cheaper form of the same position available.",
      },
      {
        kind: "choice",
        id: "t8-set-cap",
        objectives: ["set-sizing"],
        prompt: "What caps a multi-outcome set trade?",
        options: [
          "The most expensive outcome",
          "The thinnest outcome",
          "The number of outcomes",
          "The widest spread in the set",
        ],
        answerIndex: 1,
        explanation:
          "You need one of every outcome for the guarantee to hold, so the least available size decides the trade — and with several legs, a thin one is very likely.",
      },
    ],
  },
};
