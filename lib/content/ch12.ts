import { CAPSTONE_SUITE } from "./capstoneScenarios";
import type { Chapter } from "./schema";

export const chapter12: Chapter = {
  number: 12,
  slug: "capstone",
  title: "Capstone — Strategy sandbox",
  teaches: "Write a real scanner, state your strategy before you code it, and be scored on markets you have not seen.",
  estimatedMinutes: 60,
  lab: true,

  objectives: [
    { id: "state-strategy", statement: "State a strategy as entry, sizing, exit, and accepted risk." },
    { id: "implement", statement: "Implement a stated strategy against the tick API." },
    { id: "debug-from-results", statement: "Debug a strategy from its own run results." },
    { id: "generalise", statement: "Explain why a strategy underperforms on a market it has not seen." },
  ],

  lessons: [
    {
      id: "say-it-first",
      title: "Say it before you code it",
      objectives: ["state-strategy"],
      defines: [],
      points: [
        "Every strategy needs four things stated **before** any code exists.",
        "**Entry** — what condition, computable from the book, makes you trade?",
        "**Sizing** — how much, and what caps it?",
        "**Exit** — what closes the position, on every path including 'the run ended'?",
        "**Risk** — what are you knowingly accepting that could go wrong?",
        "The coach will not write a line until you have given it all four.",
      ],
      body: [
        "You have spent eleven chapters learning to see things. This chapter is about turning what you see into something a machine can execute, and it starts away from the keyboard.",
        "Before writing code, state the strategy in plain sentences: what makes you enter, how much you take, what makes you get out, and what risk you are knowingly carrying. Chapter 11 called this an execution policy. It is the same thing.",
        "The coach here is deliberately unhelpful about the part that matters. It will not tell you where the arbitrage is and will not invent a strategy from a vague request. Give it your four parts and it becomes genuinely useful: it translates faithfully and tells you what is weak. Ask it for the answer and it will hand the question back.",
        "That is not an obstacle. If you cannot state the strategy, you do not have one yet, and code written in that state is just a guess that runs quickly.",
      ],
    },
    {
      id: "the-api",
      title: "What your code gets",
      objectives: ["implement"],
      defines: [],
      points: [
        "You write `onTick(ctx)`, called once per tick.",
        "`ctx.market` — bestBid, bestAsk, bids, asks, spread. Prices: 1000 = $1.00.",
        "`ctx.account` — position, cash, realised, locked.",
        "`ctx.memory` — your own scratch space, kept between ticks.",
        "Return `{type:\"buy\"|\"sell\", qty}` or `{type:\"hold\"}`.",
        "Your code runs sandboxed: no network, no page access, and a time budget.",
      ],
      body: [
        "The API is deliberately shaped like a real exchange client, so what you learn here transfers.",
        "Each tick you receive the current book and your own position, and you return an action. State you want to keep between ticks goes in ctx.memory. Prices are integers in sub-cent units — 620 is $0.62 — because floating-point money silently eats exactly the kind of one-tick edge you are hunting.",
        "Your code runs in a sandbox with no network access, no access to this page, and a hard time budget per tick. An infinite loop stops your strategy; it does not freeze the browser. Write accordingly.",
      ],
    },
    {
      id: "scored",
      title: "How you are judged",
      objectives: ["debug-from-results", "generalise"],
      defines: [],
      points: [
        `Your strategy runs against ${CAPSTONE_SUITE.length} markets, one of which you have never seen.`,
        "Net profit after costs must be positive **across the suite**, not on your favourite one.",
        "Ending a run holding an open position **fails**, however profitable it looked.",
        "Drawdown beyond the limit fails.",
        "Then the real question: why did it do worse on the market it had not seen?",
      ],
      body: [
        "Running your strategy gives you a breakdown rather than a grade: profit per scenario, trades taken, worst drawdown, and whether you ended holding anything.",
        "Two rules will catch most first attempts. Profit is judged across the whole suite, so a strategy tuned to one market and broken on the others fails. And ending a run with an open position fails outright — Chapter 11's lesson, enforced: an unclosed leg is not a profit, it is an unfinished trade you happened to be ahead on.",
        "The suite includes a market your strategy has never seen. That is the one that matters. A strategy that does well on the three you tuned against and badly on the fourth has not learned anything general, and the final question of this course is whether you can explain why.",
      ],
    },
  ],

  drills: [
    {
      kind: "choice",
      id: "d12-four-parts",
      objectives: ["state-strategy"],
      prompt: "Which of these is a complete strategy statement?",
      options: [
        "Buy when it's cheap",
        "Buy 20 when the ask is under 480, sell all at 60 ticks left, accepting partial fills and fees",
        "Find the Dutch book and take it",
        "Make money on the arbitrage",
      ],
      answerIndex: 1,
      explanation:
        "Only the second states entry, sizing, exit, and risk. The others describe a wish. If you cannot say all four, you do not yet have a strategy you could hand to a machine.",
    },
    {
      kind: "choice",
      id: "d12-api-units",
      objectives: ["implement"],
      prompt: "Your entry test is `ctx.market.bestAsk < 0.48`. Why does it never fire?",
      options: [
        "bestAsk can be undefined",
        "Prices are in sub-cent units, so you meant 480",
        "You cannot compare with <",
        "The book has no asks",
      ],
      answerIndex: 1,
      explanation:
        "Prices are integers where 1000 is $1.00, so bestAsk is around 480, never below 0.48. This is the most common first bug, and ctx.log of the value you are comparing finds it immediately.",
    },
    {
      kind: "choice",
      id: "d12-stranded",
      objectives: ["debug-from-results"],
      prompt: "Your strategy made money on every scenario but ended each one holding 30 contracts. Does it pass?",
      options: [
        "Yes — it was profitable",
        "No — an unclosed position is an unfinished trade",
        "Yes, if the drawdown was small",
        "Only if the market resolved in your favour",
      ],
      answerIndex: 1,
      explanation:
        "The profit is unrealised and depends on where the price happened to be when the clock stopped. Chapter 11 said an unclosed leg is exposure you did not choose; this is that rule, enforced.",
    },
    {
      kind: "choice",
      id: "d12-generalise",
      objectives: ["generalise"],
      prompt: "Your strategy does well on three markets and loses on the fourth, which it has never seen. What is the likeliest cause?",
      options: [
        "The fourth market is broken",
        "You tuned constants to the three you could see",
        "The sandbox is slower on the fourth",
        "Bad luck — run it again",
      ],
      answerIndex: 1,
      explanation:
        "Hard-coded prices and thresholds fitted to the markets in front of you are the standard failure. A strategy expressed in relationships — spread, depth, edge against fair value — travels. One expressed in specific numbers does not.",
    },
    {
      kind: "choice",
      id: "d12-coach",
      objectives: ["state-strategy"],
      prompt: "You ask the coach 'what's the arb here?'. What happens?",
      options: [
        "It tells you",
        "It refuses and asks you to state your strategy",
        "It gives a hint that costs score",
        "It writes partial code",
      ],
      answerIndex: 1,
      explanation:
        "Identifying the opportunity is the skill being tested, so the coach will not do it. State the four parts and it becomes a translator and a critic, which is genuinely useful.",
    },
  ],

  scenarios: [],

  test: {
    passThreshold: 0.75,
    objectiveFloor: 0.5,
    drills: [
      {
        kind: "choice",
        id: "t12-statement",
        objectives: ["state-strategy"],
        prompt: "What are the four parts of a strategy statement?",
        options: [
          "Entry, sizing, exit, risk",
          "Buy, sell, hold, wait",
          "Edge, fees, spread, depth",
          "Signal, model, backtest, deploy",
        ],
        answerIndex: 0,
        explanation:
          "Entry, sizing, exit, and the risk you are accepting. These are exactly the things a machine must be told, and exactly the things a vague plan leaves out.",
      },
      {
        kind: "choice",
        id: "t12-api",
        objectives: ["implement"],
        prompt: "What does 620 mean in the strategy API?",
        options: ["620 contracts", "$6.20", "$0.62", "62% probability, unpriced"],
        answerIndex: 2,
        explanation:
          "Prices are integers in sub-cent units where 1000 is $1.00, so 620 is $0.62 — and, since this is a prediction market, also a 62% implied probability.",
      },
      {
        kind: "choice",
        id: "t12-debug",
        objectives: ["debug-from-results"],
        prompt: "Your run reports 0 trades and no errors. What is the first thing to check?",
        options: [
          "The venue fees",
          "Whether your entry condition can ever be true",
          "Your drawdown limit",
          "The scenario seed",
        ],
        answerIndex: 1,
        explanation:
          "No trades and no errors means the code ran fine and your condition never fired. Log the values you are comparing and check they are on the scale you think they are.",
      },
      {
        kind: "choice",
        id: "t12-generalise",
        objectives: ["generalise"],
        prompt: "What makes a strategy generalise to a market it has not seen?",
        options: [
          "More tuned parameters",
          "Conditions expressed as relationships rather than fixed numbers",
          "A larger position size",
          "Trading more often",
        ],
        answerIndex: 1,
        explanation:
          "'Buy below 480' works only where 480 is meaningful. 'Buy when the ask is more than 3¢ below fair value, and the depth covers my size' is a rule that travels.",
      },
    ],
  },
};
