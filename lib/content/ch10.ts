import { makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { kellySizing } from "./generate";
import type { Chapter } from "./schema";

const TICK = 10;

/** A long run of small edges: survivable if sized well, ruinous if not. */
const bankrollRun: Scenario = {
  id: "ch10-bankroll",
  seed: 101,
  tickSize: TICK,
  durationTicks: 150,
  startingCash: cents(100 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(440), qty: 30 },
    { side: "buy", price: ticks(420), qty: 80 },
    { side: "sell", price: ticks(480), qty: 30 },
    { side: "sell", price: ticks(510), qty: 80 },
  ],
  fairValue: wander(470, 9, 111),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 20, size: 30, refreshEvery: 5 }),
    makeNoiseTaker({ id: "noise", frequency: 0.5, minSize: 3, maxSize: 14 }),
  ],
  resolution: { atTick: 150, outcome: "no" },
};

export const chapter10: Chapter = {
  number: 10,
  slug: "risk-and-sizing",
  title: "Risk & sizing",
  teaches: "Kelly, drawdown, locked capital, and why riskless positions are correlated.",
  estimatedMinutes: 40,

  objectives: [
    { id: "kelly", statement: "Compute the Kelly fraction for a binary bet." },
    { id: "fractional-kelly", statement: "Explain why practitioners bet a fraction of Kelly." },
    { id: "drawdown", statement: "Explain drawdown and the risk of ruin from over-sizing." },
    { id: "locked-capital", statement: "Account for capital locked until resolution." },
    { id: "correlated-arbs", statement: "Explain why a book of riskless arbs is correlated." },
  ],

  lessons: [
    {
      id: "kelly",
      title: "How much to bet",
      objectives: ["kelly", "fractional-kelly"],
      defines: ["Kelly", "bankroll"],
      points: [
        "Having an edge is not enough. Size decides whether you keep it.",
        "**Kelly** gives the fraction of your **bankroll** that maximises long-run growth.",
        "For a binary contract: **edge ÷ (1 − price)**.",
        "Believe 70%, pay 50¢ → edge 0.20, odds 0.50 → bet 40% of bankroll.",
        "Almost nobody bets full Kelly. A quarter is common.",
      ],
      body: [
        "You can be right about every edge in this course and still end with nothing, because edge tells you whether to bet and says nothing about how much.",
        "Kelly answers the how much. It is the fraction of your bankroll that maximises growth over many bets, and for a binary contract it is your edge divided by the odds you are getting: (belief − price) ÷ (1 − price).",
        "Believe something is 70% when it trades at 50¢: your edge is 0.20 and you are risking 50¢ to win 50¢, so Kelly says 40% of your bankroll. That number should feel uncomfortably large, and it is — which is why almost nobody bets it.",
        "The reason is subtle and important. Kelly is optimal if your probability estimate is exactly right. It never is. A quarter of Kelly gives up a little growth for a lot of protection against your own estimate being wrong, and being wrong about your edge is far more likely than the arithmetic failing.",
      ],
    },
    {
      id: "ruin",
      title: "The asymmetry of losing",
      objectives: ["drawdown"],
      defines: ["drawdown", "risk of ruin"],
      points: [
        "**Drawdown** is how far you fall from your peak.",
        "Losses hurt more than equivalent gains help: down 50% needs +100% to recover.",
        "Bet more than twice Kelly and your expected growth goes **negative**.",
        "That is true even when every single bet is positive expectancy.",
        "**Risk of ruin** is not about being wrong. It is about being right too big.",
      ],
      body: [
        "Here is the fact that makes sizing matter more than edge.",
        "Lose 50% and you need to double just to get back to even. Lose 80% and you need five times. This asymmetry means a deep drawdown is not a setback you trade your way out of — it is a materially different game with a much smaller stake.",
        "The consequence is the part people find genuinely counterintuitive: bet more than about twice Kelly and your long-run growth rate turns negative even though every individual bet is positive expectancy. You are right on every trade and you still go to zero. Variance does it, and no amount of being correct prevents it.",
        "So the question is never just 'is this a good bet'. It is 'is this a good bet at this size', and the second question is the one that kills people.",
      ],
    },
    {
      id: "locked",
      title: "Money you cannot use",
      objectives: ["locked-capital"],
      defines: ["capital lockup"],
      points: [
        "Capital in an unresolved position is stuck there. That is **capital lockup**.",
        "A 3% arb that resolves tomorrow is excellent. The same 3% over a year is not.",
        "Always ask: what is the return *per unit of time and capital*?",
        "Shorts lock collateral too — $1 per contract, held aside.",
        "A book full of locked capital cannot take the next opportunity.",
      ],
      body: [
        "Every position you hold is money that cannot be doing anything else until the market resolves, and prediction markets resolve slowly.",
        "This changes how you should read a return. Three cents on a dollar is 3%, which sounds fine — but if that market resolves in eleven months it is 3% a year, and you have spent eleven months unable to act on anything better. The same 3% overnight is an extraordinary rate.",
        "So judge opportunities by return per unit of capital per unit of time, not by the headline percentage. This is exactly why merge matters in Chapter 6: it converts a locked position back into free capital immediately.",
        "Shorts are worse in this respect. A short contract can cost you up to $1 at resolution, so that $1 is held aside as collateral the entire time — for a position whose maximum gain might be a few cents.",
      ],
    },
    {
      id: "correlated",
      title: "Riskless things that fail together",
      objectives: ["correlated-arbs"],
      defines: ["correlated risk"],
      points: [
        "Twenty 'riskless' arbs sounds diversified. Often it is one position.",
        "Same venue: it halts, freezes withdrawals, or fails. All twenty are affected.",
        "Same resolution source: one bad decision hits everything at once.",
        "Same counterparty, same chain, same oracle — all **correlated risk**.",
        "The arbitrage is riskless. Your book of arbitrages is not.",
      ],
      body: [
        "This is the lesson that matters most for the bot you are going to build, and it is the one that sounds least urgent right now.",
        "You run twenty arbitrages. Each is individually riskless — the logic holds on every path. It is tempting to conclude you have twenty independent riskless positions, and therefore no risk worth thinking about.",
        "But look at what they share. They probably sit on one venue, which can halt trading, freeze withdrawals, change its rules, or simply fail. Several may resolve from the same source, so one ambiguous decision hits many at once. On-chain, they share a contract, a chain, an oracle.",
        "None of that shows up in the per-trade arithmetic. Each position is riskless with respect to the *event*. Your book is exposed to everything the events have in common — and those exposures arrive together, on your largest day, which is precisely when you can least afford them.",
        "So size against the shared risk, not against the individual one. 'How much am I willing to lose if this venue disappears tomorrow' is a better question than any per-trade calculation.",
      ],
    },
  ],

  drills: [
    kellySizing("d10-kelly", ["kelly"]),
    kellySizing("d10-kelly-2", ["kelly"]),
    {
      kind: "choice",
      id: "d10-fractional",
      objectives: ["fractional-kelly"],
      prompt: "Why do experienced traders bet a fraction of Kelly rather than full Kelly?",
      options: [
        "Full Kelly is illegal on most venues",
        "Their probability estimate might be wrong, and fractional Kelly is forgiving of that",
        "It produces faster growth",
        "Fees make full Kelly impossible",
      ],
      answerIndex: 1,
      explanation:
        "Full Kelly is optimal only if your estimate is exact. It never is. Betting a quarter gives up a little growth for a great deal of protection against your own overconfidence.",
    },
    {
      kind: "choice",
      id: "d10-overbet",
      objectives: ["drawdown"],
      prompt: "You bet three times Kelly on a series of genuinely positive-expectancy trades. What happens long run?",
      options: [
        "Three times the growth",
        "The same growth with more volatility",
        "Negative expected growth — you tend towards ruin",
        "Growth stops but capital is preserved",
      ],
      answerIndex: 2,
      explanation:
        "Past about twice Kelly the growth rate turns negative. Every bet is still +EV; the compounding of large losses does the damage. Being right does not save you from being too big.",
    },
    {
      kind: "choice",
      id: "d10-lockup",
      objectives: ["locked-capital"],
      prompt: "Two arbs both pay 3%. One resolves tomorrow, one in a year. How do they compare?",
      options: [
        "Identical — same return",
        "The overnight one is vastly better per unit of time",
        "The year-long one is better — more time to be right",
        "Cannot compare without knowing the fees",
      ],
      answerIndex: 1,
      explanation:
        "3% overnight is an extraordinary annualised rate; 3% over a year is mediocre, and it blocks your capital from everything better in the meantime. Always judge return per unit of capital per unit of time.",
    },
    {
      kind: "choice",
      id: "d10-correlated",
      objectives: ["correlated-arbs"],
      prompt: "You hold fifteen riskless arbs, all on one venue. What is your actual exposure?",
      options: [
        "None — each is riskless",
        "Fifteen independent small risks",
        "One large exposure to that venue",
        "Only the fees",
      ],
      answerIndex: 2,
      explanation:
        "Each is riskless with respect to its event. All fifteen share the venue, so a halt, a freeze, or a failure hits every one at once. That is a single concentrated position wearing a diversified costume.",
    },
  ],

  scenarios: [
    {
      id: "survive-the-run",
      scenario: bankrollRun,
      brief:
        "A long run in a market that drifts a lot and finally resolves NO. Size your positions so that you are still standing at the end. Over-sizing early is the usual way to fail this.",
      objectives: ["drawdown", "locked-capital"],
      success: [
        { kind: "min-realised", cents: -20 * ONE_DOLLAR, label: "Survive without a deep drawdown" },
      ],
    },
  ],

  test: {
    passThreshold: 0.85,
    objectiveFloor: 0.6,
    drills: [
      kellySizing("t10-kelly", ["kelly"]),
      kellySizing("t10-kelly-2", ["kelly"]),
      {
        kind: "choice",
        id: "t10-fractional",
        objectives: ["fractional-kelly"],
        prompt: "What does betting a quarter of Kelly buy you?",
        options: [
          "Higher expected growth",
          "Protection against your edge estimate being wrong",
          "Lower fees",
          "Faster resolution",
        ],
        answerIndex: 1,
        explanation:
          "It sacrifices a little growth for a great deal of robustness. Since your edge is an estimate rather than a known quantity, that is a trade worth making every time.",
      },
      {
        kind: "choice",
        id: "t10-ruin",
        objectives: ["drawdown"],
        prompt: "After a 50% drawdown, what return do you need to get back to even?",
        options: ["50%", "75%", "100%", "150%"],
        answerIndex: 2,
        explanation:
          "Halving requires doubling to undo. This asymmetry is why avoiding deep drawdowns matters more than capturing every edge.",
      },
      {
        kind: "choice",
        id: "t10-correlated",
        objectives: ["correlated-arbs", "locked-capital"],
        prompt: "What is the best question to ask when sizing a book of arbitrages?",
        options: [
          "What is my edge per trade?",
          "How much am I willing to lose if this venue fails tomorrow?",
          "How many trades can I fit?",
          "What is the average time to resolution?",
        ],
        answerIndex: 1,
        explanation:
          "Per-trade arithmetic already says each one is riskless. The exposure that can actually hurt you is the one they all share, so size against that.",
      },
    ],
  },
};
