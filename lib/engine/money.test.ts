import { describe, it, expect } from "vitest";
import {
  ticks, cents, notional, complement, roundToTick, onTick,
  formatPrice, formatCents, formatProbability, ONE_DOLLAR,
} from "./money";

describe("ticks", () => {
  it("rejects non-integers and out-of-range prices", () => {
    expect(() => ticks(1.5)).toThrow(RangeError);
    expect(() => ticks(-1)).toThrow(RangeError);
    expect(() => ticks(ONE_DOLLAR + 1)).toThrow(RangeError);
  });

  it("accepts the boundaries", () => {
    expect(ticks(0)).toBe(0);
    expect(ticks(ONE_DOLLAR)).toBe(ONE_DOLLAR);
  });
});

describe("notional", () => {
  it("is exact for values that would drift as floats", () => {
    // 0.07 * 3 === 0.21000000000000002 in float
    expect(notional(ticks(70), 3)).toBe(210);
  });

  it("rejects fractional quantities", () => {
    expect(() => notional(ticks(500), 1.5)).toThrow(RangeError);
  });
});

describe("complement", () => {
  it("round-trips: YES + NO = $1", () => {
    for (let p = 0; p <= ONE_DOLLAR; p += 7) {
      expect(complement(complement(ticks(p)))).toBe(p);
      expect(ticks(p) + complement(ticks(p))).toBe(ONE_DOLLAR);
    }
  });
});

describe("roundToTick", () => {
  it("snaps to the venue grid", () => {
    expect(roundToTick(624, 10)).toBe(620);
    expect(roundToTick(625, 10)).toBe(630);
    expect(onTick(roundToTick(627, 10), 10)).toBe(true);
  });

  it("rejects a bad tick size", () => {
    expect(() => roundToTick(500, 0)).toThrow(RangeError);
  });
});

describe("formatting", () => {
  it("renders whole cents with two places and sub-cents with three", () => {
    expect(formatPrice(ticks(620))).toBe("$0.62");
    expect(formatPrice(ticks(625))).toBe("$0.625");
    expect(formatPrice(ticks(ONE_DOLLAR))).toBe("$1.00");
  });

  it("renders negative cash with a leading sign, not just colour (D39)", () => {
    expect(formatCents(cents(-1500))).toBe("-$1.50");
    expect(formatCents(cents(1500))).toBe("$1.50");
  });

  it("renders a price as the probability it represents", () => {
    expect(formatProbability(ticks(620))).toBe("62.0%");
  });
});
