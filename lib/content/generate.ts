import type { Rng } from "@/lib/engine/rng";
import { cents, formatCents, formatPrice, ONE_DOLLAR, ticks } from "@/lib/engine/money";
import type { BookReadDrill, DrillTemplate, NumericDrill } from "./schema";

/** A plausible two-sided book: a mid, a spread, and a few levels either side. */
export function randomBook(rng: Rng, levels = 3) {
  const tickSize = 10;
  const mid = rng.int(20, 80) * tickSize;
  const halfSpread = rng.int(1, 4) * tickSize;
  const book: { side: "buy" | "sell"; price: number; qty: number }[] = [];

  for (let i = 0; i < levels; i++) {
    book.push({ side: "buy", price: mid - halfSpread - i * tickSize, qty: rng.int(5, 60) });
    book.push({ side: "sell", price: mid + halfSpread + i * tickSize, qty: rng.int(5, 60) });
  }
  return book;
}

const best = (book: ReturnType<typeof randomBook>, side: "buy" | "sell") =>
  book.filter((l) => l.side === side).reduce((a, b) => (side === "buy" ? (b.price > a.price ? b : a) : b.price < a.price ? b : a));

/** "Read the best bid / best ask / spread off this book." */
export function readTheBook(id: string, objectives: string[], ask: BookReadDrill["ask"]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const book = randomBook(rng);
      const bid = best(book, "buy");
      const offer = best(book, "sell");

      const answers: Record<BookReadDrill["ask"], number> = {
        "best-bid": bid.price,
        "best-ask": offer.price,
        spread: offer.price - bid.price,
        "depth-at-best-ask": offer.qty,
        "cost-to-buy": 0,
      };

      const prompts: Record<BookReadDrill["ask"], string> = {
        "best-bid": "What is the best bid?",
        "best-ask": "What is the best ask?",
        spread: "How wide is the spread, in cents?",
        "depth-at-best-ask": "How many contracts are offered at the best ask?",
        "cost-to-buy": "What would it cost to buy at the best ask?",
      };

      const explanations: Record<BookReadDrill["ask"], string> = {
        "best-bid": `The best bid is the highest price anyone will buy at: ${formatPrice(ticks(bid.price))}. Sell now and this is what you receive.`,
        "best-ask": `The best ask is the lowest price anyone will sell at: ${formatPrice(ticks(offer.price))}. Buy now and this is what you pay.`,
        spread: `${formatPrice(ticks(offer.price))} − ${formatPrice(ticks(bid.price))} = ${(offer.price - bid.price) / 10}¢. Cross it and you have paid for immediacy.`,
        "depth-at-best-ask": `${offer.qty} contracts rest at ${formatPrice(ticks(offer.price))}. Want more than that and you pay a worse price for the rest.`,
        "cost-to-buy": "",
      };

      return {
        kind: "book-read",
        id: `${id}-${rng.int(0, 1e9)}`,
        objectives,
        book,
        ask,
        answer: answers[ask],
        prompt: prompts[ask],
        explanation: explanations[ask],
      } satisfies BookReadDrill;
    },
  };
}

/** "A price of $0.62 implies what probability?" and the reverse. */
export function priceToProbability(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const price = rng.int(5, 95) * 10;
      const percent = (price / ONE_DOLLAR) * 100;
      return {
        kind: "numeric",
        id: `${id}-${price}`,
        objectives,
        prompt: `A contract that pays $1.00 if an event happens is trading at ${formatPrice(ticks(price))}. What probability does that imply?`,
        answer: percent,
        tolerance: 0.5,
        unit: "%",
        explanation: `${formatPrice(ticks(price))} out of $1.00 is ${percent}%. The price and the probability are the same number — one just has a dollar sign in front of it.`,
      } satisfies NumericDrill;
    },
  };
}

/**
 * "You buy N contracts at market. What average price do you get?" The answer is computed
 * by walking the generated book, so it cannot drift from the book shown.
 */
export function walkTheBook(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const book = randomBook(rng, 3);
      const asks = book
        .filter((l) => l.side === "sell")
        .sort((a, b) => a.price - b.price);

      const capacity = asks.reduce((n, l) => n + l.qty, 0);
      const walk = (size: number) => {
        let remaining = size;
        let paid = 0;
        const steps: string[] = [];
        for (const level of asks) {
          if (remaining === 0) break;
          const take = Math.min(remaining, level.qty);
          remaining -= take;
          paid += take * level.price;
          steps.push(`${take} at ${formatPrice(ticks(level.price))}`);
        }
        const filled = size - remaining;
        return { paid, filled, steps, average: Math.round(paid / filled) };
      };

      // Grow the size until the rounded average is strictly worse than the quote,
      // otherwise the drill would claim slippage it cannot show.
      let qty = asks[0]!.qty + rng.int(1, asks[1]!.qty);
      let result = walk(qty);
      while (result.average <= asks[0]!.price && qty < capacity) {
        qty += 1;
        result = walk(qty);
      }
      const { paid, steps, average, filled } = result;

      return {
        kind: "book-read",
        id: `${id}-${rng.int(0, 1e9)}`,
        objectives,
        book,
        ask: "cost-to-buy",
        qty,
        answer: average,
        prompt: `You buy ${qty} contracts at market. What average price do you pay?`,
        explanation: `Your order walks the book: ${steps.join(", then ")}. That is ${formatCents(
          cents(paid),
        )} for ${filled} contracts, so the average is ${formatPrice(
          ticks(average),
        )} — worse than the ${formatPrice(ticks(asks[0]!.price))} you saw on screen.`,
      } satisfies BookReadDrill;
    },
  };
}

/** Price to decimal odds, the form most of the world outside the US quotes. */
export function decimalOdds(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const price = rng.int(10, 90) * 10;
      const probability = price / ONE_DOLLAR;
      const odds = 1 / probability;
      return {
        kind: "numeric",
        id: `${id}-${price}`,
        objectives,
        prompt: `A contract trades at ${formatPrice(ticks(price))}. What are the equivalent decimal odds?`,
        answer: Math.round(odds * 100) / 100,
        tolerance: 0.02,
        explanation: `Decimal odds are 1 ÷ probability. ${formatPrice(
          ticks(price),
        )} is ${(probability * 100).toFixed(0)}%, so 1 ÷ ${probability.toFixed(
          2,
        )} = ${odds.toFixed(2)}. Stake $1 and you get $${odds.toFixed(2)} back if it happens.`,
      } satisfies NumericDrill;
    },
  };
}

/** "You think it is really X%. The market says Y. What is your edge?" */
export function edgeInCents(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const price = rng.int(15, 85) * 10;
      const belief = Math.max(5, Math.min(95, Math.round(price / 10) + rng.int(-20, 20)));
      const edge = belief * 10 - price;
      return {
        kind: "numeric",
        id: `${id}-${price}-${belief}`,
        objectives,
        prompt: `The market is offering at ${formatPrice(
          ticks(price),
        )}. You believe the true probability is ${belief}%. What is your edge per contract, in cents? (Use a minus sign if buying is a bad idea.)`,
        answer: edge / 10,
        tolerance: 0.05,
        unit: "¢",
        explanation:
          edge > 0
            ? `You think each contract is worth ${belief}¢ and you can buy it for ${
                price / 10
              }¢, so your edge is ${edge / 10}¢. Positive edge means buying is worth doing.`
            : `You think each contract is worth ${belief}¢ but it costs ${
                price / 10
              }¢, so buying loses ${Math.abs(edge) / 10}¢ of value per contract. Negative edge — the trade to consider is selling, not buying.`,
      } satisfies NumericDrill;
    },
  };
}

/** "You buy N contracts at P. What do you pay?" */
export function costOfTrade(id: string, objectives: string[]): DrillTemplate {
  return {
    id,
    objectives,
    generate: (rng) => {
      const price = rng.int(10, 90) * 10;
      const qty = rng.int(5, 200);
      const total = price * qty;
      return {
        kind: "numeric",
        id: `${id}-${price}-${qty}`,
        objectives,
        prompt: `You buy ${qty} contracts at ${formatPrice(ticks(price))}. What do you pay in total?`,
        answer: total / ONE_DOLLAR,
        tolerance: 0.005,
        unit: "$",
        explanation: `${qty} × ${formatPrice(ticks(price))} = $${(total / ONE_DOLLAR).toFixed(2)}. Each contract pays $1.00 if the event happens, so ${qty} contracts can return at most $${qty}.00.`,
      } satisfies NumericDrill;
    },
  };
}
