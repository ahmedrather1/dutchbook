import { cents, formatCents, formatPrice, ONE_DOLLAR, ticks } from "@/lib/engine/money";
import { findDutchBook } from "@/lib/venues/positions";
import { makePolymarket } from "@/lib/venues/polymarket";
import { kalshi } from "@/lib/venues/kalshi";
import type { ChoiceDrill, DrillTemplate, NumericDrill } from "./schema";

const freeVenue = makePolymarket("geopolitics");

/**
 * "YES is X, NO is Y. Is there an arb?" Roughly half the generated cases are traps where
 * the pair costs more than $1, so the answer cannot be guessed from the question's shape.
 */
export function spotDutchBook(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const real = rng.bool(0.5);
      const yesAsk = rng.int(20, 75) * 10;
      // A real arb leaves the pair under $1; a trap puts it over.
      const noAsk = real
        ? ONE_DOLLAR - yesAsk - rng.int(2, 8) * 10
        : ONE_DOLLAR - yesAsk + rng.int(1, 8) * 10;

      const book = findDutchBook(freeVenue, ticks(yesAsk), 100, ticks(noAsk), 100);

      return {
        kind: "choice",
        id: `${id}-${yesAsk}-${noAsk}`,
        objectives,
        prompt: `YES is offered at ${formatPrice(ticks(yesAsk))} and NO at ${formatPrice(
          ticks(noAsk),
        )}. Ignoring costs, is there a locked profit?`,
        options: [
          "Yes — buy both and keep the difference",
          "No — the pair costs more than $1.00",
          "Only if the event resolves YES",
          "Cannot tell without the probability",
        ],
        answerIndex: book.grossPerPair > 0 ? 0 : 1,
        explanation:
          book.grossPerPair > 0
            ? `They sum to ${formatCents(cents(book.combined))}. One of the two pays $1.00 whatever happens, so paying ${formatCents(
                cents(book.combined),
              )} for a guaranteed $1.00 locks in ${formatCents(cents(book.grossPerPair))} per pair.`
            : `They sum to ${formatCents(cents(book.combined))}, which is more than the $1.00 the pair is guaranteed to return. Buying both loses ${formatCents(
                cents(-book.grossPerPair),
              )} per pair — this is the trap.`,
      } satisfies ChoiceDrill;
    },
  };
}

/** "How much is the arb worth per pair, after fees?" Uses the real Kalshi fee model. */
export function dutchBookNet(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const yesAsk = rng.int(25, 65) * 10;
      const gross = rng.int(3, 12) * 10;
      const noAsk = ONE_DOLLAR - yesAsk - gross;
      const book = findDutchBook(kalshi, ticks(yesAsk), 100, ticks(noAsk), 100);

      return {
        kind: "numeric",
        id: `${id}-${yesAsk}-${gross}`,
        objectives,
        prompt: `On Kalshi, YES is ${formatPrice(ticks(yesAsk))} and NO is ${formatPrice(
          ticks(noAsk),
        )}. After fees on both legs, what is the profit per pair, in cents? (Negative if it loses.)`,
        answer: book.netPerPair / 10,
        tolerance: 0.15,
        unit: "¢",
        explanation: `Gross is $1.00 − ${formatCents(cents(book.combined))} = ${formatCents(
          cents(book.grossPerPair),
        )}. Kalshi charges a fee on each leg, and both legs sit near the middle of the range where fees are dearest. Net comes to ${formatCents(
          cents(book.netPerPair),
        )} per pair — ${
          book.netPerPair > 0
            ? "still worth taking"
            : book.netPerPair === 0
              ? "exactly break-even, so all risk and no reward"
              : "a loss, despite the gross edge"
        }.`,
      } satisfies NumericDrill;
    },
  };
}

/** "These N outcomes are mutually exclusive. Do their prices admit an arb?" */
export function multiOutcomeSum(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const count = rng.int(3, 4);
      const real = rng.bool(0.5);
      const target = real ? ONE_DOLLAR - rng.int(3, 9) * 10 : ONE_DOLLAR + rng.int(1, 9) * 10;

      // Split the target across the outcomes without letting any land at zero.
      const cuts = Array.from({ length: count - 1 }, () => rng.int(1, target - 1)).sort((a, b) => a - b);
      const raw = [...cuts, target].map((v, i) => v - (i === 0 ? 0 : cuts[i - 1]!));
      const asks = raw.map((v) => Math.max(10, Math.round(v / 10) * 10));
      const total = asks.reduce((a, b) => a + b, 0);

      return {
        kind: "choice",
        id: `${id}-${asks.join("-")}`,
        objectives,
        prompt: `Exactly one of these ${count} outcomes will happen. Their best offers are ${asks
          .map((a) => formatPrice(ticks(Math.min(a, ONE_DOLLAR))))
          .join(", ")}. Ignoring costs, can you lock a profit by buying all of them?`,
        options: [
          "Yes — they sum to less than $1.00",
          "No — they sum to more than $1.00",
          "Only if you buy the cheapest one",
          "Only if they are equally likely",
        ],
        answerIndex: total < ONE_DOLLAR ? 0 : 1,
        explanation: `They sum to ${formatCents(cents(total))}. Exactly one outcome pays $1.00, so ${
          total < ONE_DOLLAR
            ? `buying the whole set costs ${formatCents(cents(total))} and returns $1.00 — a locked ${formatCents(
                cents(ONE_DOLLAR - total),
              )}.`
            : `buying the whole set costs more than the $1.00 it returns. No arb.`
        }`,
      } satisfies ChoiceDrill;
    },
  };
}

/**
 * "News moved fair value to X. The book still offers at Y. Act or not?"
 * Half the cases are genuinely stale, half are already correct — so the answer cannot be
 * read off the shape of the question.
 */
export function staleQuote(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const stale = rng.bool(0.5);
      const newFair = rng.int(25, 75) * 10;
      // A stale offer sits well below the new fair value; a corrected one sits above it.
      const offer = stale
        ? newFair - rng.int(4, 15) * 10
        : newFair + rng.int(1, 6) * 10;
      const edge = newFair - offer;

      return {
        kind: "choice",
        id: `${id}-${newFair}-${offer}`,
        objectives,
        prompt: `News has just moved fair value to ${formatPrice(
          ticks(newFair),
        )}. There is still an offer resting at ${formatPrice(
          ticks(offer),
        )}. Should you lift it?`,
        options: [
          "Yes — it is below fair value",
          "No — it is already at or above fair value",
          "Only if the spread is tight",
          "Only after the market reprices",
        ],
        answerIndex: stale ? 0 : 1,
        explanation: stale
          ? `Buying at ${formatPrice(ticks(offer))} something now worth ${formatPrice(
              ticks(newFair),
            )} is ${formatCents(cents(edge))} per contract — if you get there first, and if the news really is news.`
          : `At ${formatPrice(ticks(offer))} the offer is already at or above the new fair value of ${formatPrice(
              ticks(newFair),
            )}. There is nothing here; the market has already repriced and you are the slow one.`,
      } satisfies ChoiceDrill;
    },
  };
}

/** Cross-venue: the same event on two venues, after normalising for fees. */
export function crossVenue(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const yesOnA = rng.int(30, 70) * 10;
      const gap = rng.int(2, 10) * 10;
      const noOnB = ONE_DOLLAR - yesOnA - gap;

      return {
        kind: "numeric",
        id: `${id}-${yesOnA}-${gap}`,
        objectives,
        prompt: `The same event: Kalshi offers YES at ${formatPrice(
          ticks(yesOnA),
        )}, Polymarket offers NO at ${formatPrice(
          ticks(noOnB),
        )}. Buying one of each costs how much in total, in cents?`,
        answer: (yesOnA + noOnB) / 10,
        tolerance: 0.05,
        unit: "¢",
        explanation: `${formatPrice(ticks(yesOnA))} + ${formatPrice(
          ticks(noOnB),
        )} = ${formatCents(cents(yesOnA + noOnB))}. Exactly one of the two pays $1.00, so anything under $1.00 is locked profit — split across two venues, which is where leg risk comes in.`,
      } satisfies NumericDrill;
    },
  };
}
