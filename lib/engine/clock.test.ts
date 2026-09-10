import { describe, it, expect } from "vitest";
import { Clock } from "./clock";

const run = (speed: number, wallMs: number) => {
  const c = new Clock(250, speed);
  const seen: number[] = [];
  c.onTick((t) => seen.push(t));
  // Deliver the same wall time in 10ms slices, as a frame loop would.
  for (let i = 0; i < wallMs / 10; i++) c.advanceByWallMs(10);
  return seen;
};

describe("Clock", () => {
  it("counts ticks, not milliseconds", () => {
    const c = new Clock();
    c.advance(3);
    expect(c.tick).toBe(3);
  });

  it("produces the same tick sequence at 1x and 8x, only sooner (D18)", () => {
    const slow = run(1, 2500);
    const fast = run(8, 2500 / 8);
    expect(fast).toEqual(slow);
    expect(slow).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("carries fractional time instead of dropping it", () => {
    const c = new Clock(250, 1);
    for (let i = 0; i < 25; i++) c.advanceByWallMs(10); // 250ms total
    expect(c.tick).toBe(1);
  });

  it("stops while paused and resumes where it left off", () => {
    const c = new Clock(250, 1);
    c.advanceByWallMs(250);
    c.pause();
    c.advanceByWallMs(10_000);
    expect(c.tick).toBe(1);
    c.resume();
    c.advanceByWallMs(250);
    expect(c.tick).toBe(2);
  });

  it("rejects a non-positive speed", () => {
    expect(() => new Clock().setSpeed(0)).toThrow(RangeError);
  });
});
