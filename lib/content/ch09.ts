import { jump, makeInformedTrader, makeMarketMaker, makeNoiseTaker } from "@/lib/engine/agents";
import { cents, ticks, ONE_DOLLAR } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";
import { staleQuote } from "./arbGenerate";
import type { Chapter } from "./schema";

const TICK = 10;

/** News arrives mid-run; a slow maker leaves a stale quote behind for a few ticks. */
const newsEvent: Scenario = {
  id: "ch09-news",
  seed: 91,
  tickSize: TICK,
  durationTicks: 110,
  startingCash: cents(200 * ONE_DOLLAR),
  initialBook: [
    { side: "buy", price: ticks(400), qty: 30 },
    { side: "buy", price: ticks(380), qty: 80 },
    { side: "sell", price: ticks(440), qty: 30 },
    { side: "sell", price: ticks(470), qty: 80 },
  ],
  fairValue: jump(420, 780, 40),
  agents: () => [
    // Slow refresh is what leaves the stale quote sitting there after the news.
    makeMarketMaker({ id: "slow-mm", halfSpread: 20, size: 30, refreshEvery: 12 }),
    makeNoiseTaker({ id: "noise", frequency: 0.3, minSize: 2, maxSize: 8 }),
    makeInformedTrader({ id: "hft", frequency: 0.6, minSize: 8, maxSize: 25, edgeThreshold: 40 }),
  ],
};

/** The "news" is noise and fair value snaps back, so lifting the quote loses. */
const falseSignal: Scenario = {
  ...newsEvent,
  id: "ch09-false-signal",
  seed: 92,
  durationTicks: 120,
  fairValue: (t) => (t >= 40 && t < 55 ? ticks(760) : ticks(420)),
  agents: () => [
    makeMarketMaker({ id: "mm", halfSpread: 25, size: 25, refreshEvery: 6 }),
    makeNoiseTaker({ id: "noise", frequency: 0.35, minSize: 3, maxSize: 10 }),
    makeInformedTrader({ id: "hft", frequency: 0.7, minSize: 10, maxSize: 30, edgeThreshold: 30 }),
  ],
};

export const chapter9: Chapter = {
  number: 9,
  slug: "arb-temporal",
  title: "ARB IV — Temporal",
  teaches: "Stale quotes, latency windows, and knowing when you are the slow one.",
  estimatedMinutes: 40,

  objectives: [
    { id: "spot-stale", statement: "Recognise a quote that has not repriced after news." },
    { id: "latency-window", statement: "Explain why the opportunity lasts only moments." },
    { id: "adverse-selection", statement: "Recognise adverse selection — when the stale quote knows more than you." },
    { id: "mm-vs-arb", statement: "Distinguish arbing a stale quote from making markets." },
    { id: "speed-implications", statement: "State what this implies for a bot's design." },
  ],

  lessons: [
    {
      id: "stale-quotes",
      title: "The quote that has not caught up",
      objectives: ["spot-stale", "latency-window"],
      defines: ["stale quote", "latency"],
      points: [
        "News arrives. Fair value moves. Some resting orders do not.",
        "A **stale quote** is an order still priced for a world that has changed.",
        "Lifting it is profit — the price is wrong and you know why.",
        "**Latency** is delay: how long between the news and the quote updating.",
        "That delay is your entire window. It is usually measured in milliseconds.",
      ],
      body: [
        "The three previous chapters found prices that disagreed with each other. This one finds prices that disagree with the world.",
        "Something happens — a result, a number, a headline. Fair value jumps. Most resting orders update within moments, but not all of them. Whoever left an order at the old price is now offering something at a price that no longer makes sense. That is a stale quote, and taking it is profit.",
        "The window is the latency: the gap between the news being knowable and the quote being corrected. On a busy market that is milliseconds. It closes whether or not you were ready.",
      ],
    },
    {
      id: "adverse-selection",
      title: "When you are the slow one",
      objectives: ["adverse-selection"],
      defines: ["adverse selection"],
      points: [
        "Sometimes the quote is not stale. **You** are the one who is behind.",
        "Your order filled instantly because someone better informed wanted it filled.",
        "That is **adverse selection**: you get filled most on your worst trades.",
        "A quote that looks too good has usually been left there on purpose.",
        "Ask first: why is this still here?",
      ],
      body: [
        "Now the uncomfortable half, and it is the one that separates people who make money from people who are very busy.",
        "You lift what looks like a stale quote and it fills instantly, in full. That should worry you. On a fast market, an obviously wrong price gets taken in milliseconds by people with better information and faster systems than yours. If it was still sitting there when you arrived, ask why.",
        "Often the answer is that it is not stale at all — the news you are reacting to was already known, already priced, and the person on the other side is happy to take your order. You were not early. You were the last to find out.",
        "This is adverse selection, and it has a nasty shape: you get filled most reliably on exactly the trades you should not be making. The trades you want tend to be the ones that slip away.",
        "The defence is a question, asked every time: why is this still here? If you do not have a specific answer, you probably are the answer.",
      ],
    },
    {
      id: "mm-vs-arb",
      title: "Two different businesses",
      objectives: ["mm-vs-arb", "speed-implications"],
      defines: ["market making"],
      points: [
        "**Market making** is resting quotes on both sides and earning the spread.",
        "Arbing stale quotes is crossing the spread to take a price that is wrong.",
        "The maker's risk is being picked off by news. Yours is being too slow.",
        "They are opposite sides of the same event — often the same trade.",
        "For a bot: this chapter's edge needs speed. The earlier chapters' edges do not.",
      ],
      body: [
        "It is worth being clear that these are different businesses that happen to meet at the same trade.",
        "A market maker rests quotes on both sides and profits from the spread, many times over. Their nightmare is precisely this chapter: news arrives, their quotes are stale, and someone takes them at a price that is now wrong. That loss is the cost of doing their business.",
        "The temporal arbitrageur is the person on the other side of that loss. Same trade, opposite roles.",
        "For the bot you are going to build, this matters more than any other lesson here. The Chapter 6, 7 and 8 edges are about seeing clearly — you can find them with careful scanning, and they last long enough to act on. This chapter's edge is about being fast, and if you are not genuinely fast you will lose this game consistently while believing you are unlucky. Know which edge you are actually pursuing.",
      ],
    },
  ],

  drills: [
    staleQuote("d9-stale", ["spot-stale"]),
    staleQuote("d9-stale-2", ["spot-stale"]),
    {
      kind: "choice",
      id: "d9-why-still-here",
      objectives: ["adverse-selection"],
      prompt:
        "An obviously mispriced quote is still resting ten seconds after the news. What is the most likely explanation?",
      options: [
        "Everyone else missed it",
        "It is not mispriced — you are working from stale information",
        "The venue is broken",
        "The maker is being generous",
      ],
      answerIndex: 1,
      explanation:
        "Ten seconds is an eternity. If a genuinely free trade survived that long, the far likelier explanation is that your information is the stale part, not the quote.",
    },
    {
      kind: "choice",
      id: "d9-fill-quality",
      objectives: ["adverse-selection"],
      prompt: "Your resting orders fill instantly and in full most of the time. What should you suspect?",
      options: [
        "Your prices are competitive",
        "You are being adversely selected",
        "The market is very liquid",
        "Your sizes are too small",
      ],
      answerIndex: 1,
      explanation:
        "Getting everything you ask for means people want to trade against you. Good fills feel like success and are frequently the opposite — you are being picked off by someone who knows more.",
    },
    {
      kind: "choice",
      id: "d9-window",
      objectives: ["latency-window"],
      prompt: "Why is a stale-quote opportunity usually gone within moments?",
      options: [
        "Fees rise after news",
        "The maker reprices, or someone faster takes it first",
        "The venue halts trading",
        "The spread widens automatically",
      ],
      explanation:
        "Two things close the window and both are fast: the person who left the quote updates it, or a quicker participant lifts it. Neither waits for you.",
      answerIndex: 1,
    },
    {
      kind: "choice",
      id: "d9-mm",
      objectives: ["mm-vs-arb"],
      prompt: "A market maker's quotes are lifted right after a surprise result. What happened to them?",
      options: [
        "They earned the spread",
        "They were picked off on a stale quote",
        "They were adversely selected in their favour",
        "Nothing — they are hedged",
      ],
      answerIndex: 1,
      explanation:
        "Their resting orders had not repriced, so someone took them at yesterday's price. That is the market maker's core risk, and it is exactly this chapter's opportunity seen from the other side.",
    },
    {
      kind: "choice",
      id: "d9-bot",
      objectives: ["speed-implications"],
      prompt: "Which edge is least dependent on raw speed?",
      options: [
        "Lifting a stale quote after news",
        "A Dutch book sitting in one venue's book",
        "Reacting to a headline before the market does",
        "Beating another bot to a mispriced fill",
      ],
      answerIndex: 1,
      explanation:
        "A Dutch book is visible in the book and depends on careful scanning, not reaction time. The other three are races, and you should only enter races you can win.",
    },
  ],

  scenarios: [
    {
      id: "the-news",
      scenario: newsEvent,
      brief:
        "News lands partway through and fair value jumps hard. One maker refreshes slowly, leaving a stale offer behind — but an informed trader is hunting it too. Take it if you can get there first.",
      objectives: ["spot-stale", "latency-window"],
      success: [
        { kind: "min-position", qty: 15, label: "Get to the stale quote in time" },
        { kind: "min-realised", cents: 1, label: "Finish ahead" },
      ],
    },
    {
      id: "the-false-signal",
      scenario: falseSignal,
      brief:
        "This looks like the last scenario. It is not: the move is noise and the price snaps back. Chasing it is how adverse selection actually feels. Leaving it alone is the winning move.",
      objectives: ["adverse-selection"],
      success: [{ kind: "min-realised", cents: 0, label: "Do not lose money chasing noise" }],
    },
  ],

  test: {
    passThreshold: 0.85,
    objectiveFloor: 0.6,
    drills: [
      staleQuote("t9-stale", ["spot-stale"]),
      staleQuote("t9-stale-2", ["spot-stale"]),
      {
        kind: "choice",
        id: "t9-window",
        objectives: ["latency-window"],
        prompt: "What determines how long a stale-quote opportunity lasts?",
        options: [
          "The size of the mispricing",
          "How quickly the slowest participant reprices",
          "The venue's fee schedule",
          "The time until resolution",
        ],
        answerIndex: 1,
        explanation:
          "The window closes when whoever left the quote updates it, or when someone faster takes it. Neither has anything to do with how large the mispricing is.",
      },
      {
        kind: "choice",
        id: "t9-adverse",
        objectives: ["adverse-selection"],
        prompt: "What is the defining feature of adverse selection?",
        options: [
          "You lose money on average",
          "You get filled most often on the trades you least want",
          "Your orders are rejected",
          "Fees exceed your edge",
        ],
        answerIndex: 1,
        explanation:
          "Fills are not random. The ones that complete easily are disproportionately the ones a better-informed counterparty wanted you to have.",
      },
      {
        kind: "choice",
        id: "t9-business",
        objectives: ["mm-vs-arb"],
        prompt: "How do market making and temporal arbitrage relate?",
        options: [
          "They are the same strategy",
          "They are opposite sides of the same trade",
          "They never interact",
          "Market makers only trade after news",
        ],
        answerIndex: 1,
        explanation:
          "The maker rests and earns the spread while risking being picked off; the temporal arbitrageur is the one doing the picking off. One trade, two roles.",
      },
      {
        kind: "choice",
        id: "t9-speed",
        objectives: ["speed-implications"],
        prompt: "You are building a bot with ordinary retail latency. Which chapter's edge should it chase?",
        options: [
          "Chapter 9 — stale quotes after news",
          "Chapter 6 — Dutch books visible in the book",
          "Whichever pays most per trade",
          "All of them equally",
        ],
        answerIndex: 1,
        explanation:
          "Pursue edges that reward seeing clearly rather than reacting fastest. Racing professionals on latency with retail infrastructure is a reliable way to lose money slowly.",
      },
    ],
  },
};
