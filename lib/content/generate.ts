import type { Rng } from "@/lib/engine/rng";
import { formatPrice, ONE_DOLLAR, ticks } from "@/lib/engine/money";
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
