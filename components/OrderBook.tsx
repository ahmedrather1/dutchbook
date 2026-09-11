"use client";

import { formatPrice, type Ticks } from "@/lib/engine/money";
import type { Level } from "@/lib/engine/book";

export interface OrderBookProps {
  bids: Level[];
  asks: Level[];
  /** Explain each number on focus/hover — Chapter 1 leans on this (D2). */
  teaching?: boolean;
  levels?: number;
}

const cumulative = (levels: Level[]) => {
  let total = 0;
  return levels.map((l) => ({ ...l, cum: (total += l.qty) }));
};

export function OrderBook({ bids, asks, teaching = false, levels = 6 }: OrderBookProps) {
  const bidRows = cumulative(bids.slice(0, levels));
  const askRows = cumulative(asks.slice(0, levels));
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  const spread = bestBid !== undefined && bestAsk !== undefined ? bestAsk - bestBid : undefined;
  const maxCum = Math.max(1, ...bidRows.map((r) => r.cum), ...askRows.map((r) => r.cum));

  return (
    <div className="font-mono text-sm border border-rule rounded-md overflow-hidden bg-surface">
      <div className="grid grid-cols-3 px-3 py-2 text-[10px] uppercase tracking-wider text-muted border-b border-rule bg-raised">
        <span>Bid size</span>
        <span className="text-center">Price</span>
        <span className="text-right">Ask size</span>
      </div>

      <Side rows={[...askRows].reverse()} side="sell" maxCum={maxCum} teaching={teaching} best={bestAsk} />

      <div className="flex items-center justify-center gap-2 px-3 py-2 border-y border-rule bg-paper text-xs">
        {spread === undefined ? (
          <span className="text-muted">no two-sided market</span>
        ) : (
          <>
            <span className="text-muted">spread</span>
            <span
              className="tabular-nums text-ink"
              title={teaching ? "Buy and sell straight away and you lose this much." : undefined}
            >
              {(spread / 10).toFixed(1)}¢
            </span>
          </>
        )}
      </div>

      <Side rows={bidRows} side="buy" maxCum={maxCum} teaching={teaching} best={bestBid} />
    </div>
  );
}

function Side({
  rows,
  side,
  maxCum,
  teaching,
  best,
}: {
  rows: (Level & { cum: number })[];
  side: "buy" | "sell";
  maxCum: number;
  teaching: boolean;
  best: Ticks | undefined;
}) {
  const isBid = side === "buy";
  // Sign and label, never colour alone (D39).
  const mark = isBid ? "+" : "−";

  if (rows.length === 0) {
    return <div className="px-3 py-3 text-xs text-muted">{isBid ? "no bids" : "no offers"}</div>;
  }

  return (
    <div>
      {rows.map((row) => {
        const isBest = row.price === best;
        return (
          <div
            key={row.price}
            tabIndex={teaching ? 0 : -1}
            title={
              teaching
                ? `${row.qty} contracts ${isBid ? "wanted" : "offered"} at ${formatPrice(row.price)}. ${row.cum} cumulative.`
                : undefined
            }
            className="relative grid grid-cols-3 px-3 py-1 tabular-nums focus:outline-2 focus:outline-accent"
          >
            <span
              aria-hidden
              className={`absolute inset-y-0 ${isBid ? "left-0 bg-bid/15" : "right-0 bg-ask/15"}`}
              style={{ width: `${(row.cum / maxCum) * 50}%` }}
            />
            <span className={`relative ${isBid ? "text-ink" : "text-muted"}`}>
              {isBid ? row.qty : ""}
            </span>
            <span
              className={`relative text-center ${isBid ? "text-bid" : "text-ask"} ${isBest ? "font-semibold" : ""}`}
            >
              <span aria-hidden className="opacity-60 mr-0.5">
                {mark}
              </span>
              {formatPrice(row.price)}
              <span className="sr-only">{isBid ? " bid" : " ask"}</span>
            </span>
            <span className={`relative text-right ${isBid ? "text-muted" : "text-ink"}`}>
              {isBid ? "" : row.qty}
            </span>
          </div>
        );
      })}
    </div>
  );
}
