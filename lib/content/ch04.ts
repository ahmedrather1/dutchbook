import { makeMarketMaker, makeNoiseTaker, wander } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { settlementPnl } from "./generate";
import type { Chapter } from "./schema";

const TICK = 10;

/** Runs to a scripted resolution so the player feels settlement rather than reading about it. */
const holdToResolution: Scenario = {
  id: "ch04-resolution",
  seed: 41,
  tickSize: TICK,
  durationTicks: 100,
  startingCash: cents(100 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(620), qty: 20 },
    { side: "buy", price: ticks(600), qty: 45 },
    { side: "sell", price: ticks(660), qty: 18 },
    { side: "sell", price: ticks(680), qty: 40 },
  ],
  fairValue: wander(640, 6, 44),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 25, size: 20, refreshEvery: 4 }),
    makeNoiseTaker({ id: "noise", frequency: 0.4, minSize: 2, maxSize: 10 }),
  ],
  resolution: { atTick: 100, outcome: "yes" },
};

export const chapter4: Chapter = {
  number: 4,
  slug: "prediction-markets",
  title: "Prediction markets",
  teaches: "Binary contracts, YES/NO, resolution, and how Polymarket and Kalshi differ.",
  estimatedMinutes: 30,

  objectives: [
    { id: "binary-contract", statement: "Explain what a $0–$1 binary contract pays and when." },
    { id: "yes-no-identity", statement: "Use YES + NO = $1 and show buying NO equals selling YES." },
    { id: "resolution", statement: "Explain resolution and settlement, and who decides them." },
    { id: "settlement-pnl", statement: "Compute your profit or loss after a market resolves." },
    { id: "venue-differences", statement: "State how Polymarket and Kalshi actually differ." },
  ],

  lessons: [
    {
      id: "the-contract",
      title: "The contract itself",
      objectives: ["binary-contract"],
      defines: [],
      points: [
        "One contract pays **$1.00** if the event happens, **$0.00** if it does not.",
        "Nothing in between. There is no partial credit.",
        "So a price is capped: nobody rationally pays over $1.00 for one.",
        "Your maximum loss per contract is what you paid. Your maximum gain is $1.00 minus that.",
      ],
      body: [
        "Everything in this course rests on one very simple instrument, so it is worth being precise about it.",
        "A contract pays exactly $1.00 if the event happens and exactly $0.00 if it does not. There is no middle outcome, no partial credit, no settling halfway because it nearly happened.",
        "Two things follow immediately. Nobody should ever pay more than $1.00 for one, because $1.00 is the most it can possibly be worth. And your downside is capped at what you paid — unlike shorting a stock, there is a floor.",
      ],
    },
    {
      id: "yes-and-no",
      title: "Two sides of one coin",
      objectives: ["yes-no-identity"],
      defines: ["complement"],
      points: [
        "Every market has a YES contract and a NO contract.",
        "Exactly one of them pays $1.00. Always. Whatever happens.",
        "So **YES + NO = $1.00**, and they are **complements** of each other.",
        "YES at $0.62 means NO is $0.38. Buying NO at $0.38 = selling YES at $0.62.",
        "Kalshi publishes this directly: a YES bid at X is a NO ask at $1.00 − X.",
      ],
      body: [
        "Here is the identity that the whole of Chapter 6 is built on, so slow down for it.",
        "Every market has two contracts: one that pays if the event happens, one that pays if it does not. Exactly one of them will be worth $1.00 when the dust settles, and the other will be worth nothing. Not sometimes — always, by construction.",
        "So if you own one of each, you are guaranteed exactly $1.00. Which means the two prices must add up to $1.00. If YES is trading at $0.62, NO must be $0.38, and these are the same statement said two ways. Buying NO at $0.38 gives you precisely the exposure of selling YES at $0.62.",
        "Kalshi makes this explicit in its own data: it publishes only bids on both sides, because a YES bid at X is exactly a NO ask at $1.00 minus X. The asks are implied.",
        "Hold on to this. When those two numbers add up to less than $1.00, somebody is giving money away — and that is what Chapter 6 teaches you to take.",
      ],
    },
    {
      id: "resolution",
      title: "How it ends",
      objectives: ["resolution", "settlement-pnl"],
      defines: ["resolution", "settlement"],
      points: [
        "**Resolution** is the moment the real-world question gets answered.",
        "**Settlement** is the payout: every contract becomes $1.00 or $0.00.",
        "Until then your money is **locked up** in the position.",
        "Someone has to decide the outcome — an exchange, or an oracle. That is a real risk.",
        "P&L is simple: what it settled at, minus what you paid, times how many you hold.",
      ],
      body: [
        "At some point the question gets answered. The election happens, the game ends, the number is published. That moment is resolution, and the payout that follows is settlement.",
        "Your profit is then almost embarrassingly simple. Hold 100 YES bought at $0.30, and it resolves YES: each becomes $1.00, so you made $0.70 each, $70 in total. Resolves NO: they become worthless and you lost your $30.",
        "Two things are easy to miss. First, until resolution your capital is stuck in that position and cannot be doing anything else — Chapter 10 puts a price on that. Second, somebody has to actually decide the outcome. On Kalshi that is the exchange against published sources; on Polymarket it is an oracle process. Either way, 'the market was right but resolved wrong' is a real way to lose money, and no amount of clever trading protects you from it.",
      ],
    },
    {
      id: "venues",
      title: "Two venues, two rulebooks",
      objectives: ["venue-differences"],
      defines: ["merge"],
      points: [
        "**Kalshi**: a US-regulated exchange, denominated in dollars.",
        "**Polymarket**: an order book settled in USDC on-chain.",
        "Fees: Kalshi charges everyone; Polymarket charges **takers only** and rebates makers.",
        "Both fee formulas peak at $0.50 — the coin flip is the dearest trade on either.",
        "Polymarket lets you **merge** a YES and a NO back into $1.00. Kalshi, as modelled here, does not.",
        "These differences are the raw material for Chapter 7.",
      ],
      body: [
        "The two venues in this game are modelled on real ones, and their parameters were taken from their published documentation rather than from memory. You can read the sources in the repo.",
        "They price the same idea differently. Kalshi charges a fee to whoever trades, on both sides. Polymarket charges only takers — rest an order there and you pay nothing, and may even collect a rebate from the fees others paid. That single difference changes which strategies make sense on which venue.",
        "Both, interestingly, charge most when the price is near $0.50 and least at the extremes, because both formulas contain price × (1 − price). A coin flip is the most expensive thing you can trade.",
        "Polymarket also lets you merge a YES and a NO back into $1.00 whenever you like, and has a further mechanic for multi-outcome events that Chapter 8 covers. Kalshi, as modelled here, has neither.",
      ],
    },
  ],

  drills: [
    settlementPnl("d4-settle", ["settlement-pnl", "binary-contract"]),
    settlementPnl("d4-settle-2", ["settlement-pnl"]),
    {
      kind: "choice",
      id: "d4-complement",
      objectives: ["yes-no-identity"],
      prompt: "YES is trading at $0.71. What must NO be?",
      options: ["$0.71", "$0.29", "$1.71", "It depends on the volume"],
      answerIndex: 1,
      explanation:
        "Exactly one of them pays $1.00, so together they must be worth $1.00. $1.00 − $0.71 = $0.29. If NO were quoted anywhere else, somebody has a free profit.",
    },
    {
      kind: "choice",
      id: "d4-buying-no",
      objectives: ["yes-no-identity"],
      prompt: "You want to bet against an event trading at $0.80. What are your options?",
      options: [
        "Only sell YES at $0.80",
        "Only buy NO at $0.20",
        "Either — they are the same position",
        "Neither is possible without owning YES first",
      ],
      answerIndex: 2,
      explanation:
        "Buying NO at $0.20 and selling YES at $0.80 give identical exposure. Which one you use comes down to fees, available depth, and what the venue supports.",
    },
    {
      kind: "choice",
      id: "d4-who-decides",
      objectives: ["resolution"],
      prompt: "What is the risk that skilful trading cannot protect you from?",
      options: [
        "The price moving against you",
        "The market resolving against what actually happened",
        "Paying the spread",
        "A thin order book",
      ],
      answerIndex: 1,
      explanation:
        "Resolution risk sits outside the market. If whoever decides the outcome gets it wrong, or the wording turns out ambiguous, being right about the world does not save you. Chapter 10 counts this among the correlated risks.",
    },
    {
      kind: "choice",
      id: "d4-venue-fees",
      objectives: ["venue-differences"],
      prompt: "You plan to rest limit orders all day and rarely cross the spread. Which venue's fee model suits you?",
      options: [
        "Kalshi, which charges both sides",
        "Polymarket, which charges takers only",
        "Neither — fees are identical",
        "Whichever has the tighter tick",
      ],
      answerIndex: 1,
      explanation:
        "Polymarket charges only takers and rebates makers from those fees. A pure resting strategy pays nothing there, while Kalshi charges you whether you were patient or not.",
    },
  ],

  scenarios: [
    {
      id: "hold-to-resolution",
      scenario: holdToResolution,
      brief:
        "Buy some contracts and hold them all the way to the end. The market resolves YES on the final tick. Watch your position settle and your cash jump — and notice the money was locked up the whole time.",
      objectives: ["resolution", "settlement-pnl", "binary-contract"],
      success: [
        { kind: "min-position", qty: 10, label: "Hold at least 10 into resolution" },
        { kind: "min-realised", cents: 1, label: "Finish ahead after settlement" },
      ],
    },
  ],

  test: {
    passThreshold: 0.8,
    drills: [
      settlementPnl("t4-settle", ["settlement-pnl"]),
      settlementPnl("t4-settle-2", ["binary-contract"]),
      {
        kind: "choice",
        id: "t4-identity",
        objectives: ["yes-no-identity"],
        prompt: "YES is $0.45 and NO is $0.50 on the same market. What does that tell you?",
        options: [
          "The market thinks it is 45% likely",
          "They sum to $0.95, so buying both locks in 5¢",
          "NO is overpriced and YES is fair",
          "Nothing — the two are unrelated",
        ],
        answerIndex: 1,
        explanation:
          "One of them will pay $1.00 whatever happens. Paying $0.95 for a guaranteed $1.00 is 5¢ of locked profit, before costs. That is a Dutch book, and Chapter 6 is about finding them.",
      },
      {
        kind: "choice",
        id: "t4-resolution",
        objectives: ["resolution"],
        prompt: "What happens to your capital between buying and resolution?",
        options: [
          "It earns interest",
          "It is locked in the position and cannot be used elsewhere",
          "It is returned and replaced by credit",
          "It can be withdrawn at any time",
        ],
        answerIndex: 1,
        explanation:
          "The money is committed until the market resolves. On a market that settles in six months, an apparently attractive return has to be judged against tying up your capital for six months.",
      },
      {
        kind: "choice",
        id: "t4-venues",
        objectives: ["venue-differences"],
        prompt: "Which statement about the two venues is true?",
        options: [
          "Both charge takers and makers equally",
          "Both fee formulas peak near $0.50",
          "Kalshi supports merging YES and NO into $1.00",
          "Polymarket charges a flat fee per trade",
        ],
        answerIndex: 1,
        explanation:
          "Both fee formulas contain price × (1 − price), which is largest at $0.50. The others are wrong: Polymarket charges takers only, and merge is a Polymarket mechanic.",
      },
      {
        kind: "choice",
        id: "t4-fee-shape",
        objectives: ["venue-differences", "binary-contract"],
        prompt: "Which trade carries the largest fee, for the same number of contracts?",
        options: ["At $0.05", "At $0.50", "At $0.95", "They are all the same"],
        answerIndex: 1,
        explanation:
          "Fees follow price × (1 − price), which is at its maximum when the price is $0.50 and near zero at both extremes. The coin flip is the most expensive trade on either venue.",
      },
    ],
  },
};
