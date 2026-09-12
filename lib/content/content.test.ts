import { describe, it, expect } from "vitest";
import { CHAPTERS, PLANNED_TITLES } from "./registry";
import { instantiate, isTemplate, referencedObjectives, type Chapter } from "./schema";
import { makeRng } from "@/lib/engine/rng";
import { runScenario } from "@/lib/engine/sim";

const each = (fn: (c: Chapter) => void) => CHAPTERS.forEach((c) => fn(c));

describe("registry", () => {
  it("is in curriculum order and matches the locked arc (D8)", () => {
    CHAPTERS.forEach((c, i) => {
      expect(c.number).toBe(i + 1);
      expect(c.title).toBe(PLANNED_TITLES[i]);
    });
  });

  it("has unique slugs", () => {
    const slugs = CHAPTERS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("objective coverage (D-5)", () => {
  it("assesses every declared objective with at least one drill", () => {
    each((c) => {
      const drilled = new Set(c.drills.flatMap((d) => d.objectives));
      for (const o of c.objectives) {
        expect(drilled, `ch${c.number} objective "${o.id}" has no drill`).toContain(o.id);
      }
    });
  });

  it("covers every objective in the chapter test", () => {
    each((c) => {
      const tested = new Set([
        ...c.test.drills.flatMap((d) => d.objectives),
        ...(c.test.scenarios ?? []).flatMap((s) => s.objectives),
      ]);
      for (const o of c.objectives) {
        expect(tested, `ch${c.number} objective "${o.id}" is never tested`).toContain(o.id);
      }
    });
  });

  it("references no objective that the chapter does not declare", () => {
    each((c) => {
      const declared = new Set(c.objectives.map((o) => o.id));
      for (const id of referencedObjectives(c)) {
        expect(declared, `ch${c.number} references unknown objective "${id}"`).toContain(id);
      }
    });
  });

  it("teaches every objective in at least one lesson", () => {
    each((c) => {
      const taught = new Set(c.lessons.flatMap((l) => l.objectives));
      for (const o of c.objectives) {
        expect(taught, `ch${c.number} objective "${o.id}" is never taught`).toContain(o.id);
      }
    });
  });
});

describe("drills", () => {
  it("gives every drill a unique id and an explanation", () => {
    each((c) => {
      const ids = [...c.drills, ...c.test.drills].map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const d of [...c.drills, ...c.test.drills]) {
        if (!isTemplate(d)) expect(d.explanation.length).toBeGreaterThan(20);
      }
    });
  });

  it("generates self-consistent variants across 100 seeds (D-3)", () => {
    each((c) => {
      for (const d of [...c.drills, ...c.test.drills]) {
        if (!isTemplate(d)) continue;
        for (let seed = 0; seed < 100; seed++) {
          const instance = instantiate(d, makeRng(seed));
          expect(instance.objectives).toEqual(d.objectives);
          expect(instance.prompt.length).toBeGreaterThan(0);
          expect(instance.explanation.length).toBeGreaterThan(0);

          if (instance.kind === "numeric") expect(Number.isFinite(instance.answer)).toBe(true);
          if (instance.kind === "choice") {
            expect(instance.options[instance.answerIndex]).toBeDefined();
          }
          if (instance.kind === "book-read") {
            const bids = instance.book.filter((l) => l.side === "buy").map((l) => l.price);
            const asks = instance.book.filter((l) => l.side === "sell").map((l) => l.price);
            expect(Math.max(...bids)).toBeLessThan(Math.min(...asks));
            expect(instance.answer).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  it("does not repeat itself between consecutive retries", () => {
    each((c) => {
      for (const d of c.test.drills) {
        if (!isTemplate(d)) continue;
        const first = instantiate(d, makeRng(1));
        const second = instantiate(d, makeRng(2));
        expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
      }
    });
  });
});

describe("book-read answers are computed correctly", () => {
  it("matches the book it generated", () => {
    each((c) => {
      for (const d of [...c.drills, ...c.test.drills]) {
        if (!isTemplate(d)) continue;
        for (let seed = 0; seed < 50; seed++) {
          const i = instantiate(d, makeRng(seed));
          if (i.kind !== "book-read") continue;
          const bid = Math.max(...i.book.filter((l) => l.side === "buy").map((l) => l.price));
          const ask = Math.min(...i.book.filter((l) => l.side === "sell").map((l) => l.price));
          if (i.ask === "best-bid") expect(i.answer).toBe(bid);
          if (i.ask === "best-ask") expect(i.answer).toBe(ask);
          if (i.ask === "spread") expect(i.answer).toBe(ask - bid);
        }
      }
    });
  });
});

describe("scenarios", () => {
  it("runs every referenced scenario headlessly and deterministically", () => {
    each((c) => {
      for (const step of [...c.scenarios, ...(c.test.scenarios ?? [])]) {
        const a = runScenario(step.scenario);
        const b = runScenario(step.scenario);
        expect(a.log, `${step.id} is not deterministic`).toBe(b.log);
        expect(a.events.length).toBeGreaterThan(0);
      }
    });
  });

  it("leaves a tradeable two-sided book, so the brief is achievable", () => {
    each((c) => {
      for (const step of c.scenarios) {
        const { book } = runScenario(step.scenario);
        expect(book.bestAsk(), `${step.id} has no offers`).toBeDefined();
      }
    });
  });
});

describe("jargon discipline (D2)", () => {
  it("never uses a term before the lesson that defines it", () => {
    const defined = new Set<string>();
    for (const c of CHAPTERS) {
      for (const lesson of c.lessons) {
        const text = lesson.body.join(" ").toLowerCase();
        // Jargon only. Ordinary English a beginner already knows ("fee", "price",
        // "profit") does not belong here — over-listing turns the guard into noise.
        const GLOSSARY = [
          "order book", "binary contract", "market order", "limit order",
          "resting order", "queue priority", "slippage", "walking the book",
          "bid", "ask", "spread", "depth", "maker", "taker",
          "fair value", "edge", "decimal odds", "expected value", "variance",
          "complement", "resolution", "settlement",
          "all-in cost", "break-even edge", "Dutch book", "arbitrage", "merge",
          "cross-venue arbitrage", "leg risk",
          "mutually exclusive", "negative risk", "correlation",
          "stale quote", "latency", "adverse selection", "market making",
          "Kelly", "bankroll", "drawdown", "capital lockup", "correlated risk",
          "partial fill", "rate limit", "execution policy",
        ];
        for (const term of GLOSSARY) {
          if (!text.includes(term)) continue;
          const definesHere = lesson.defines?.includes(term) ?? false;
          expect(
            defined.has(term) || definesHere,
            `ch${c.number}/${lesson.id} uses "${term}" before defining it`,
          ).toBe(true);
        }
        lesson.defines?.forEach((t) => defined.add(t));
      }
    }
  });
});
