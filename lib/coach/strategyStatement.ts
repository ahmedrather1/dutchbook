/**
 * The coach will not write code until the player has stated a strategy (D23).
 *
 * "Stated a strategy" is defined structurally, not by vibes: four parts must be present.
 * This parser is what enforces it, so the guardrail holds even without an LLM (D24) and
 * cannot be bypassed by editing a prompt.
 */

export type StrategyPart = "entry" | "sizing" | "exit" | "risk";

export const PART_LABELS: Record<StrategyPart, string> = {
  entry: "Entry — what condition makes you trade?",
  sizing: "Sizing — how much, and what caps it?",
  exit: "Exit — what closes the position?",
  risk: "Risk — what are you accepting that could go wrong?",
};

const PATTERNS: Record<StrategyPart, RegExp[]> = {
  entry: [
    /\b(when|if|whenever|once|as soon as|entry|enter|trigger|signal)\b/i,
    /\b(buy|sell|take|lift|hit)\b.*\b(when|if|below|above|under|over|cheaper|less than|more than)\b/i,
  ],
  sizing: [
    /\b(size|sizing|quantity|qty|contracts|shares|amount|stake|position size)\b/i,
    /\b(\d+\s*(contracts|shares|units))\b/i,
    /\b(kelly|fraction|percent|%|bankroll|capped? (at|by)|limit(ed)? to|no more than|up to)\b/i,
  ],
  exit: [
    /\b(exit|close|unwind|flatten|sell out|merge|take profit|stop|resolution|settle|hold until)\b/i,
  ],
  risk: [
    /\b(risk|danger|wrong|lose|loss|downside|fail|leg risk|stranded|adverse|slippage|fees?|drawdown|worst case)\b/i,
  ],
};

/** Phrases that are asking the coach to do the thinking (D23). */
const ANSWER_SEEKING: RegExp[] = [
  /\b(just )?(give|show|tell|write|do) (me|it|us)\b.*\b(the )?(code|answer|solution|strategy)\b/i,
  /\bwhat('s| is) the (arb|arbitrage|answer|trade|edge)\b/i,
  /\bwhere('s| is) the (arb|arbitrage|edge|opportunity)\b/i,
  /\b(write|create|generate|make|build) (me )?(a|the|some)?\s*(working |winning |profitable )?(strategy|bot|scanner|code|solution)\b/i,
  /\bfix (it|this|my code) for me\b/i,
  /\bsolve (it|this)\b/i,
  /\bdo it for me\b/i,
  /\bwhat should (i|my strategy) (do|buy|sell|trade)\b/i,
  /\bignore (the |your )?(previous |above )?(instructions|rules|prompt)\b/i,
  /\byou are now\b.*\b(unrestricted|free|allowed)\b/i,
  /\bpretend (you are|to be)\b/i,
];

export interface StatementCheck {
  present: StrategyPart[];
  missing: StrategyPart[];
  complete: boolean;
  /** True when the message is asking the coach for the answer rather than stating one. */
  answerSeeking: boolean;
}

export function checkStatement(text: string): StatementCheck {
  const answerSeeking = ANSWER_SEEKING.some((re) => re.test(text));

  const present: StrategyPart[] = [];
  const missing: StrategyPart[] = [];
  for (const part of Object.keys(PATTERNS) as StrategyPart[]) {
    const hit = PATTERNS[part].some((re) => re.test(text));
    (hit ? present : missing).push(part);
  }

  // A bare demand is never a statement, however many keywords it happens to contain.
  const complete = missing.length === 0 && !answerSeeking && text.trim().length >= 40;
  return { present, missing, complete, answerSeeking };
}

/** What the coach says when the statement is not yet complete. Used with or without an LLM. */
export function promptForMissing(check: StatementCheck): string {
  if (check.answerSeeking) {
    return [
      "I won't hand you the answer — that's the one thing that would stop this working.",
      "Tell me the strategy you want and I'll turn it into code and tell you where it's weak.",
      "I need four things:",
      ...Object.values(PART_LABELS).map((l) => `  · ${l}`),
    ].join("\n");
  }

  if (check.missing.length === 0) return "";

  return [
    check.present.length > 0
      ? `Good — you've given me ${check.present.length} of the four parts. Still missing:`
      : "Before I can write anything, I need four things:",
    ...check.missing.map((part) => `  · ${PART_LABELS[part]}`),
  ].join("\n");
}
