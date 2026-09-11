"use client";

import { formatCents } from "@/lib/engine/money";
import type { Cents } from "@/lib/engine/money";

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-3 py-2 border-r border-rule last:border-r-0" title={hint}>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div data-stat={label} className="font-mono tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
}

/** Signed money, with the sign always present — never colour alone (D39). */
export function Money({ value }: { value: Cents }) {
  return <span className="font-mono tabular-nums">{formatCents(value)}</span>;
}

export function Button({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-mono text-xs px-3 py-2 border border-rule rounded bg-raised text-ink hover:border-accent disabled:opacity-40 disabled:hover:border-rule focus-visible:outline-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}
