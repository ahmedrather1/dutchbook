import { describe, it, expect } from "vitest";
import { spotDutchBook, dutchBookNet, multiOutcomeSum, crossVenue, staleQuote } from "./arbGenerate";
import { instantiate, type DrillTemplate } from "./schema";
import { makeRng } from "@/lib/engine/rng";
import { ONE_DOLLAR } from "@/lib/engine/money";

const many = (t: DrillTemplate, n = 120) =>
  Array.from({ length: n }, (_, seed) => instantiate(t, makeRng(seed)));

const dollars = (text: string) => (text.match(/\$\d+\.\d+/g) ?? []).map((s) => Number(s.slice(1)));

describe("spotDutchBook", () => {
  it("answers according to the prices in its own prompt", () => {
    for (const drill of many(spotDutchBook("s", ["o"]))) {
      if (drill.kind !== "choice") continue;
      const [yes, no] = dollars(drill.prompt);
      const sum = Math.round((yes! + no!) * 1000);
      expect(drill.answerIndex).toBe(sum < ONE_DOLLAR ? 0 : 1);
    }
  });

  it("generates both real arbs and traps, not just one kind", () => {
    const answers = many(spotDutchBook("s", ["o"])).map((d) =>
      d.kind === "choice" ? d.answerIndex : -1,
    );
    expect(answers.filter((a) => a === 0).length).toBeGreaterThan(20);
    expect(answers.filter((a) => a === 1).length).toBeGreaterThan(20);
  });

  it("never quotes a price outside the valid range", () => {
    for (const drill of many(spotDutchBook("s", ["o"]))) {
      for (const price of dollars(drill.prompt)) {
        expect(price).toBeGreaterThanOrEqual(0);
        expect(price).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("dutchBookNet", () => {
  it("is always smaller than the gross edge, because fees are charged", () => {
    for (const drill of many(dutchBookNet("n", ["o"]))) {
      if (drill.kind !== "numeric") continue;
      const [yes, no] = dollars(drill.prompt);
      const gross = (ONE_DOLLAR - Math.round((yes! + no!) * 1000)) / 10;
      expect(drill.answer).toBeLessThan(gross);
    }
  });

  it("says so plainly when fees turn a gross edge into a loss", () => {
    for (const drill of many(dutchBookNet("n", ["o"]))) {
      if (drill.kind !== "numeric") continue;
      if (drill.answer < 0) expect(drill.explanation).toMatch(/a loss, despite the gross edge/);
      else if (drill.answer === 0) expect(drill.explanation).toMatch(/exactly break-even/);
      else expect(drill.explanation).toMatch(/still worth taking/);
    }
  });

  it("produces both outcomes, so the answer cannot be guessed", () => {
    const answers = many(dutchBookNet("n", ["o"])).map((d) => (d.kind === "numeric" ? d.answer : 0));
    expect(answers.some((a) => a > 0)).toBe(true);
    expect(answers.some((a) => a < 0)).toBe(true);
  });
});

describe("multiOutcomeSum", () => {
  it("answers according to the sum in its own prompt", () => {
    for (const drill of many(multiOutcomeSum("m", ["o"]))) {
      if (drill.kind !== "choice") continue;
      const sum = Math.round(dollars(drill.prompt).reduce((a, b) => a + b, 0) * 1000);
      expect(drill.answerIndex).toBe(sum < ONE_DOLLAR ? 0 : 1);
    }
  });

  it("always lists at least three mutually exclusive outcomes", () => {
    for (const drill of many(multiOutcomeSum("m", ["o"]))) {
      expect(dollars(drill.prompt).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("staleQuote", () => {
  it("answers according to the two prices in its own prompt", () => {
    for (const drill of many(staleQuote("q", ["o"]))) {
      if (drill.kind !== "choice") continue;
      const [fair, offer] = dollars(drill.prompt);
      expect(drill.answerIndex).toBe(offer! < fair! ? 0 : 1);
    }
  });

  it("generates both real opportunities and already-repriced traps", () => {
    const answers = many(staleQuote("q", ["o"])).map((d) => (d.kind === "choice" ? d.answerIndex : -1));
    expect(answers.filter((a) => a === 0).length).toBeGreaterThan(20);
    expect(answers.filter((a) => a === 1).length).toBeGreaterThan(20);
  });

  it("keeps every quoted price inside the valid range", () => {
    for (const drill of many(staleQuote("q", ["o"]))) {
      for (const price of dollars(drill.prompt)) {
        expect(price).toBeGreaterThan(0);
        expect(price).toBeLessThan(1);
      }
    }
  });
});

describe("crossVenue", () => {
  it("sums the two quoted prices", () => {
    for (const drill of many(crossVenue("c", ["o"]))) {
      if (drill.kind !== "numeric") continue;
      const [a, bb] = dollars(drill.prompt);
      expect(drill.answer).toBeCloseTo((a! + bb!) * 100, 4);
    }
  });
});
