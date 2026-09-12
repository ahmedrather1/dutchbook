import type { Scenario } from "@/lib/engine/sim";
import { runStrategy, type RunOutcome } from "./runner";
import type { Strategy } from "./api";

export interface StrategyScore {
  runs: RunOutcome[];
  /** Total profit across every scenario, after costs. */
  totalPnl: number;
  profitableRuns: number;
  /** Any run that ended holding an unclosed position. */
  strandedRuns: number;
  worstDrawdown: number;
  totalTrades: number;
  errors: string[];
  passed: boolean;
  /** Why it did or did not pass, in the player's terms. */
  notes: string[];
}

export interface ScoreRules {
  /** Total profit required across the suite. */
  minTotalPnl: number;
  /** Strategies that end holding a position have not managed their risk. */
  allowStranded: boolean;
  maxDrawdown: number;
}

export const CAPSTONE_RULES: ScoreRules = {
  minTotalPnl: 1,
  allowStranded: false,
  maxDrawdown: 30_000, // $30 of a $200 bankroll
};

/**
 * Runs a strategy across a suite, including scenarios it has not seen, and reports a
 * breakdown rather than a single number (J-4). Profit alone never passes: a strategy
 * that made money while leaving legs open has not done the job.
 */
export function scoreStrategy(
  scenarios: readonly Scenario[],
  strategy: Strategy,
  rules: ScoreRules = CAPSTONE_RULES,
): StrategyScore {
  return summariseRuns(
    scenarios.map((scenario) => runStrategy(scenario, strategy)),
    rules,
  );
}

/**
 * Turns a set of finished runs into a score. Separate from `scoreStrategy` because the
 * browser produces its runs through the Web Worker and must reach the same verdict.
 */
export function summariseRuns(
  runs: readonly RunOutcome[],
  rules: ScoreRules = CAPSTONE_RULES,
): StrategyScore {
  const totalPnl = runs.reduce((sum, r) => sum + r.netPnl, 0);
  const profitableRuns = runs.filter((r) => r.netPnl > 0).length;
  const strandedRuns = runs.filter((r) => r.strandedPosition > 0).length;
  const worstDrawdown = Math.max(0, ...runs.map((r) => r.maxDrawdown));
  const totalTrades = runs.reduce((sum, r) => sum + r.trades, 0);
  const errors = runs.flatMap((r) => (r.error ? [`${r.scenarioId}: ${r.error}`] : []));

  const notes: string[] = [];
  if (errors.length > 0) notes.push(`Your code threw in ${errors.length} run(s).`);
  if (totalTrades === 0) notes.push("Your strategy never traded.");
  if (totalPnl < rules.minTotalPnl) notes.push("Net profit across the suite is not positive.");
  if (!rules.allowStranded && strandedRuns > 0) {
    notes.push(`${strandedRuns} run(s) ended holding an open position you never closed.`);
  }
  if (worstDrawdown > rules.maxDrawdown) notes.push("Drawdown went deeper than the limit allows.");

  return {
    runs: [...runs],
    totalPnl,
    profitableRuns,
    strandedRuns,
    worstDrawdown,
    totalTrades,
    errors,
    passed: notes.length === 0,
    notes,
  };
}
