import { describe, it, expect } from "vitest";
import { makeRng } from "./rng";

const draw = (seed: number, n = 100) =>
  Array.from({ length: n }, () => makeRng(seed).next());

describe("makeRng", () => {
  it("replays identically for the same seed (D18)", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it("diverges for different seeds", () => {
    expect(draw(1)[0]).not.toBe(draw(2)[0]);
  });

  it("stays in [0, 1)", () => {
    const r = makeRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("covers int bounds inclusively", () => {
    const r = makeRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.int(1, 5));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("distributes uniformly enough to model quote jitter", () => {
    const r = makeRng(3);
    let sum = 0;
    const n = 50_000;
    for (let i = 0; i < n; i++) sum += r.next();
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.01);
  });

  it("throws rather than returning undefined on an empty pick", () => {
    expect(() => makeRng(1).pick([])).toThrow(RangeError);
  });
});
