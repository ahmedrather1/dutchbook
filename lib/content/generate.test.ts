import { describe, it, expect } from "vitest";
import { decimalOdds, edgeInCents, priceToProbability, walkTheBook } from "./generate";
import { instantiate } from "./schema";
import { makeRng } from "@/lib/engine/rng";

const many = (template: ReturnType<typeof decimalOdds>, n = 100) =>
  Array.from({ length: n }, (_, seed) => instantiate(template, makeRng(seed)));

describe("priceToProbability", () => {
  it("matches the price stated in its own prompt", () => {
    for (const drill of many(priceToProbability("p", ["o"]))) {
      // The prompt also names the $1.00 payout, so match the trading price specifically.
      const price = Number(drill.prompt.match(/trading at \$(\d+\.\d+)/)![1]);
      expect(drill.kind).toBe("numeric");
      if (drill.kind === "numeric") expect(drill.answer).toBeCloseTo(price * 100, 6);
    }
  });
});

describe("decimalOdds", () => {
  it("is the reciprocal of the probability in its own prompt", () => {
    for (const drill of many(decimalOdds("d", ["o"]))) {
      const price = Number(drill.prompt.match(/\$(\d+\.\d+)/)![1]);
      if (drill.kind === "numeric") {
        expect(drill.answer).toBeCloseTo(1 / price, 1);
        expect(drill.answer).toBeGreaterThan(1);
      }
    }
  });
});

describe("edgeInCents", () => {
  it("equals belief minus price, with the sign the explanation claims", () => {
    for (const drill of many(edgeInCents("e", ["o"]))) {
      if (drill.kind !== "numeric") continue;
      const price = Number(drill.prompt.match(/\$(\d+\.\d+)/)![1]);
      const belief = Number(drill.prompt.match(/(\d+)%/)![1]);
      expect(drill.answer).toBeCloseTo(belief - price * 100, 6);

      const claimsPositive = drill.explanation.includes("Positive edge");
      expect(claimsPositive).toBe(drill.answer > 0);
    }
  });

  it("never states a losing trade as an opportunity", () => {
    for (const drill of many(edgeInCents("e", ["o"]))) {
      if (drill.kind === "numeric" && drill.answer < 0) {
        expect(drill.explanation).toMatch(/Negative edge/);
      }
    }
  });
});

describe("walkTheBook", () => {
  it("computes the average by actually walking the book it shows", () => {
    for (const drill of many(walkTheBook("w", ["o"]))) {
      if (drill.kind !== "book-read") continue;
      const asks = drill.book.filter((l) => l.side === "sell").sort((a, b) => a.price - b.price);

      let remaining = drill.qty!;
      let paid = 0;
      for (const level of asks) {
        const take = Math.min(remaining, level.qty);
        remaining -= take;
        paid += take * level.price;
      }
      expect(drill.answer).toBe(Math.round(paid / (drill.qty! - remaining)));
      // The whole lesson: the average is worse than the quote.
      expect(drill.answer).toBeGreaterThan(asks[0]!.price);
    }
  });
});
