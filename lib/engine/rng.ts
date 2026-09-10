/** Seeded PRNG. Math.random is banned in lib/ because every run must replay (D18). */

export interface Rng {
  /** [0, 1) */
  next(): number;
  /** [min, max] inclusive */
  int(min: number, max: number): number;
  bool(pTrue: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Approximately normal via Irwin–Hall; enough for jittering quotes. */
  normal(mean: number, stdDev: number): number;
}

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;

  const next = (): number => {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    bool: (pTrue) => next() < pTrue,
    pick: (items) => {
      if (items.length === 0) throw new RangeError("pick from empty array");
      return items[Math.floor(next() * items.length)]!;
    },
    normal: (mean, stdDev) => {
      const sum = next() + next() + next() + next() + next() + next();
      return mean + (sum - 3) * stdDev;
    },
  };
}
