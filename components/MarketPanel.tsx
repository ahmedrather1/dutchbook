"use client";

import { OrderBook } from "./OrderBook";
import { OrderTicket } from "./OrderTicket";
import { Tape } from "./Tape";
import { Button, Stat } from "./Terminal";
import { useSimulation } from "./useSimulation";
import { formatCents, type Cents } from "@/lib/engine/money";
import type { Scenario } from "@/lib/engine/sim";

/** Remounted on restart, so a fresh run needs no reset logic. */
export function MarketPanel({
  scenario,
  onRestart,
}: {
  scenario: Scenario;
  onRestart: () => void;
}) {
  const sim = useSimulation(scenario);
  const closed = sim.state.remaining === 0;

  return (
    <>
      <OrderBook bids={sim.state.bids} asks={sim.state.asks} teaching />

      <div className="grid grid-cols-4 border border-t-0 border-rule text-sm">
        <Stat label="Tick" value={String(sim.state.tick)} hint="Time in the simulation." />
        <Stat label="Left" value={String(sim.state.remaining)} hint="Ticks until the market closes." />
        <Stat label="Position" value={String(sim.state.position)} hint="Contracts you hold." />
        <Stat
          label="Cash"
          value={formatCents(sim.state.cash as Cents)}
          hint="What you have left to spend."
        />
      </div>

      <div className="flex gap-2 mt-3 items-center">
        {closed ? (
          <Button onClick={onRestart}>Restart market</Button>
        ) : sim.running ? (
          <Button onClick={sim.pause}>Pause</Button>
        ) : (
          <Button onClick={sim.start}>{sim.state.tick === 0 ? "Start market" : "Resume"}</Button>
        )}
        <span className="font-mono text-[11px] text-muted">
          {sim.running ? "● live" : closed ? "closed" : "paused"}
        </span>
      </div>

      {sim.state.position < 0 && (
        <p className="mt-3 text-xs text-muted border border-rule rounded-md p-3 leading-relaxed">
          <strong className="text-ink">You are short {-sim.state.position}.</strong> You sold
          contracts you did not own. That is allowed and it is a real strategy — you have promised
          to deliver them, and you profit if the price falls. Chapter 10 covers what it costs you.
          Buy them back to flatten out.
        </p>
      )}

      <OrderTicket estimate={sim.estimate} onSubmit={sim.trade} blockedReason={sim.blockedReason} />
      <Tape trades={sim.state.trades} />
    </>
  );
}
