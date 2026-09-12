import { checkStatement, promptForMissing, type StatementCheck } from "./strategyStatement";
import type { CoachMessage, LLMClient } from "./client";

/**
 * The Socratic coach (D23).
 *
 * It will not identify an arbitrage and will not write code from a bare request. The
 * guardrail is structural: `respond` refuses before the client is ever called, so it
 * cannot be talked around by prompt injection — the model never sees the message.
 */

export const COACH_SYSTEM_PROMPT = `You are a coach inside a game that teaches prediction-market arbitrage.

The player has just stated a trading strategy in their own words. Your job:

1. Translate their stated strategy into JavaScript against the provided API.
2. Critique it honestly — say what is missing, fragile, or wrong.

Hard rules, which you must never break:
- NEVER identify an arbitrage or mispricing for the player. That is their work.
- NEVER invent strategy the player did not state. If they did not say when to exit, do
  not choose an exit for them — write the code without one and tell them it is missing.
- NEVER write a complete working strategy from a vague request.
- If the player asks you for the answer, refuse and ask them to state their strategy.

Write the code exactly as they described it, even when you can see it is flawed. Then say
plainly what you think will go wrong. Being a faithful translator and an honest critic is
the whole job; improving their idea for them is not.

The API:
  onTick(ctx) is called once per tick. Return {type:"buy"|"sell", qty} or {type:"hold"}.
  ctx.market.bestBid / bestAsk / bids / asks — prices are sub-cent units, 1000 = $1.00
  ctx.account.position / cash / realised / locked
  ctx.memory — scratch space that persists between ticks
  ctx.log(...) — prints to the player's console

Keep replies short. Code first, then at most three sentences of critique.`;

export interface CoachReply {
  text: string;
  /** True when the coach declined rather than helped. */
  refused: boolean;
  check: StatementCheck;
}

export interface CoachOptions {
  client?: LLMClient;
  /** Conversation so far, for context on a follow-up. */
  history?: CoachMessage[];
}

/**
 * Decides whether to serve a request, then either refuses locally or calls the model.
 * The refusal path never reaches the client, which is what makes it a guardrail rather
 * than a suggestion.
 */
export async function respond(message: string, options: CoachOptions = {}): Promise<CoachReply> {
  const check = checkStatement(message);

  if (!check.complete) {
    return { text: promptForMissing(check), refused: true, check };
  }

  const client = options.client;
  if (!client?.available()) {
    return { text: scriptedReply(), refused: false, check };
  }

  const messages: CoachMessage[] = [...(options.history ?? []), { role: "user", content: message }];
  try {
    const text = await client.send(COACH_SYSTEM_PROMPT, messages);
    return { text, refused: false, check };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The coach is unavailable.";
    return { text: `${reason}\n\n${scriptedReply()}`, refused: false, check };
  }
}

/**
 * The no-key fallback (D27/J-8). It cannot write code, but it can hold the player to the
 * same standard and tell them what their own statement is missing.
 */
export function scriptedReply(): string {
  return [
    "Your strategy statement has all four parts. Without an API key I can't write the code for you, but here is what to check yourself:",
    "",
    "  · Entry — is your condition computable from ctx.market alone, on a single tick?",
    "  · Sizing — what happens when the book is thinner than the size you want?",
    "  · Exit — does it fire on every path, including when the scenario simply ends?",
    "  · Risk — what does a partial fill leave you holding?",
    "",
    "Write it against onTick(ctx) in the editor and run it. The scoreboard will tell you which of the four you got wrong.",
  ].join("\n");
}
