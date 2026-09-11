"use client";

import { useState } from "react";
import { formatCents, formatPrice, type Cents } from "@/lib/engine/money";
import type { FillEstimate } from "@/lib/engine/match";
import type { Side } from "@/lib/engine/book";
import { Button } from "./Terminal";

export interface OrderTicketProps {
  estimate: (side: Side, qty: number) => FillEstimate;
  onSubmit: (side: Side, qty: number) => void;
  disabled?: boolean;
}

const SIZES = [5, 10, 25, 50];

/** Shows what a trade will actually cost before you commit to it. */
export function OrderTicket({ estimate, onSubmit, disabled }: OrderTicketProps) {
  const [side, setSide] = useState<Side>("buy");
  const [qty, setQty] = useState(10);
  const preview = estimate(side, qty);

  return (
    <div className="border border-rule rounded-md bg-surface mt-3">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted border-b border-rule bg-raised">
        Order ticket
      </div>

      <div className="p-3 space-y-3">
        <div className="flex gap-2" role="group" aria-label="Side">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={`flex-1 font-mono text-xs py-2 border rounded focus-visible:outline-2 focus-visible:outline-accent ${
                side === s
                  ? "border-accent bg-raised text-ink font-semibold"
                  : "border-rule text-muted hover:border-accent"
              }`}
            >
              {s === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="qty" className="text-[10px] uppercase tracking-wider text-muted">
            Size
          </label>
          <div className="flex gap-2 mt-1">
            <input
              id="qty"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 font-mono tabular-nums text-sm px-2 py-1.5 bg-paper border border-rule rounded text-ink focus-visible:outline-2 focus-visible:outline-accent"
            />
            {SIZES.map((n) => (
              <button
                key={n}
                onClick={() => setQty(n)}
                className="font-mono text-xs px-2 border border-rule rounded text-muted hover:border-accent hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <dl className="text-xs font-mono space-y-1 border-t border-rule pt-2">
          <Row
            label={side === "buy" ? "Best ask" : "Best bid"}
            value={preview.bestPrice === undefined ? "—" : formatPrice(preview.bestPrice)}
            hint="The price on screen — good for the size resting there, and no more."
          />
          <Row
            label="Average fill"
            value={preview.averagePrice === undefined ? "—" : formatPrice(preview.averagePrice)}
            hint="What you actually pay per contract once your order walks the book."
          />
          <Row
            label={side === "buy" ? "Total cost" : "Total received"}
            value={formatCents(preview.notional as Cents)}
          />
          {preview.slippage > 0 && (
            <Row
              label="Slippage"
              value={`${(preview.slippage / 10).toFixed(1)}¢`}
              hint="Your order is too big for the best price, so the rest fills worse. This is the gap between the quote and what you actually pay."
              warn
            />
          )}
          {preview.shortfall > 0 && (
            <Row
              label="Not available"
              value={`${preview.shortfall} contracts`}
              hint="The book is too thin for the size you asked for."
              warn
            />
          )}
        </dl>

        <Button onClick={() => onSubmit(side, qty)} disabled={disabled || preview.filledQty === 0}>
          {side === "buy" ? "Buy" : "Sell"} {qty} at market
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3" title={hint}>
      <dt className="text-muted">
        {warn && <span aria-hidden>! </span>}
        {label}
      </dt>
      <dd className={`tabular-nums ${warn ? "text-ask" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
