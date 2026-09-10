/**
 * Logical clock, decoupled from wall time (D18).
 *
 * Tests call `advance(n)` synchronously; the UI drives it from a frame loop. The speed
 * multiplier changes only how fast wall time maps to ticks, never what happens per tick.
 */
export class Clock {
  private t = 0;
  private paused = false;
  private carry = 0;
  private readonly listeners: ((tick: number) => void)[] = [];

  constructor(
    /** Wall milliseconds per tick at 1x. */
    readonly msPerTick = 250,
    private speed = 1,
  ) {}

  get tick(): number {
    return this.t;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  onTick(fn: (tick: number) => void): void {
    this.listeners.push(fn);
  }

  advance(n = 1): void {
    for (let i = 0; i < n; i++) {
      this.t++;
      for (const fn of this.listeners) fn(this.t);
    }
  }

  /** Feed wall-clock deltas from a frame loop; fractional remainder carries over. */
  advanceByWallMs(ms: number): void {
    if (this.paused) return;
    this.carry += (ms * this.speed) / this.msPerTick;
    const whole = Math.floor(this.carry);
    this.carry -= whole;
    if (whole > 0) this.advance(whole);
  }

  setSpeed(multiplier: number): void {
    if (multiplier <= 0) throw new RangeError(`speed must be positive: ${multiplier}`);
    this.speed = multiplier;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }
}
