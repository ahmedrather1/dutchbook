"use client";

import { formatPrice } from "@/lib/engine/money";
import type { MatchEvent } from "@/lib/engine/match";

export interface Trade {
  price: number;
  qty: number;
  side: "buy" | "sell";
  tick: number;
}

export function toTrades(events: readonly MatchEvent[], tick: number): Trade[] {
  return events
    .filter((e) => e.kind === "fill")
    .map((e) => ({ price: e.price, qty: e.qty, side: e.takerSide, tick }));
}

/** Recent prints. The clearest signal that the market is alive rather than frozen. */
export function Tape({ trades }: { trades: Trade[] }) {
  return (
    <div className="border border-rule rounded-md bg-surface mt-3 overflow-hidden">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted border-b border-rule bg-raised">
        Recent trades
      </div>
      <div className="font-mono text-xs h-32 overflow-y-auto">
        {trades.length === 0 ? (
          <p className="px-3 py-3 text-muted">Nothing has traded yet. Press Start.</p>
        ) : (
          trades.slice(0, 12).map((t, i) => (
            <div
              key={`${t.tick}-${i}`}
              className="flex justify-between px-3 py-0.5 tabular-nums border-b border-rule/40 last:border-0"
            >
              <span className={t.side === "buy" ? "text-bid" : "text-ask"}>
                <span aria-hidden>{t.side === "buy" ? "▲" : "▼"} </span>
                {t.side === "buy" ? "bought" : "sold"}
              </span>
              <span className="text-ink">{formatPrice(t.price as never)}</span>
              <span className="text-muted">{t.qty}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
