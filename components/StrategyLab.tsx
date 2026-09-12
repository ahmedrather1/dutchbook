"use client";

import { useState } from "react";
import { CodeEditor } from "./CodeEditor";
import { CoachPanel } from "./CoachPanel";
import { Button } from "./Terminal";
import { StrategySandbox } from "@/lib/sandbox/sandbox";
import { runStrategyInSandbox } from "@/lib/sandbox/runner";
import { summariseRuns, type StrategyScore } from "@/lib/sandbox/score";
import { STARTER_TEMPLATE } from "@/lib/sandbox/api";
import { CAPSTONE_SUITE } from "@/lib/content/capstoneScenarios";
import { formatCents, type Cents } from "@/lib/engine/money";
import type { RunOutcome } from "@/lib/sandbox/runner";

export function StrategyLab() {
  const [code, setCode] = useState(STARTER_TEMPLATE);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<StrategyScore | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const run = async () => {
    setRunning(true);
    setOutcome(null);
    setLogs([]);

    const sandbox = new StrategySandbox();
    const compiled = await sandbox.compile(code);
    if (!compiled.ok) {
      setLogs([compiled.error ?? "Your code did not compile."]);
      sandbox.terminate();
      setRunning(false);
      return;
    }

    const runs: RunOutcome[] = [];
    for (const scenario of CAPSTONE_SUITE) {
      runs.push(await runStrategyInSandbox(scenario, (ctx) => sandbox.tick(ctx)));
      if (!sandbox.isRunning) break; // A timeout killed the worker.
    }
    sandbox.terminate();

    setOutcome(summariseRuns(runs));
    setLogs(runs.flatMap((r) => r.logs).slice(0, 80));
    setRunning(false);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 mt-6 items-start">
      <div className="space-y-3">
        <CodeEditor value={code} onChange={setCode} disabled={running} />
        <div className="flex gap-2">
          <Button onClick={run} disabled={running}>
            {running ? "Running…" : "Run against the suite"}
          </Button>
          <Button onClick={() => setCode(STARTER_TEMPLATE)} disabled={running}>
            Reset
          </Button>
        </div>

        {logs.length > 0 && (
          <div className="border border-rule rounded-md bg-surface overflow-hidden">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted border-b border-rule bg-raised">
              Console
            </div>
            <pre className="p-3 font-mono text-xs text-muted max-h-48 overflow-y-auto whitespace-pre-wrap">
              {logs.join("\n")}
            </pre>
          </div>
        )}

        {outcome && <Scoreboard score={outcome} />}
      </div>

      <CoachPanel onCode={setCode} />
    </div>
  );
}

function Scoreboard({ score }: { score: StrategyScore }) {
  return (
    <div className="border border-rule rounded-md bg-surface overflow-hidden">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted border-b border-rule bg-raised flex justify-between">
        <span>Result</span>
        <span className={score.passed ? "text-bid" : "text-ask"}>
          {score.passed ? "✓ passed" : "✗ not passed"}
        </span>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs tabular-nums">
          <Row label="Net P&L" value={formatCents(score.totalPnl as Cents)} />
          <Row label="Profitable runs" value={`${score.profitableRuns} / ${score.runs.length}`} />
          <Row label="Trades" value={String(score.totalTrades)} />
          <Row label="Worst drawdown" value={formatCents(score.worstDrawdown as Cents)} />
          <Row label="Stranded runs" value={String(score.strandedRuns)} />
        </div>

        {score.notes.length > 0 && (
          <ul className="space-y-1 text-sm">
            {score.notes.map((note) => (
              <li key={note} className="flex gap-2 text-ask">
                <span aria-hidden>·</span>
                {note}
              </li>
            ))}
          </ul>
        )}

        <details className="text-xs">
          <summary className="cursor-pointer text-muted hover:text-accent">Per scenario</summary>
          <table className="w-full mt-2 font-mono tabular-nums">
            <tbody>
              {score.runs.map((r) => (
                <tr key={r.scenarioId} className="border-t border-rule">
                  <td className="py-1 text-muted">{r.scenarioId}</td>
                  <td className="py-1 text-right">{formatCents(r.netPnl as Cents)}</td>
                  <td className="py-1 text-right text-muted">{r.trades} trades</td>
                  <td className="py-1 text-right text-ask">{r.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-muted">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </>
  );
}
