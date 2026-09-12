"use client";

import { useRef } from "react";

/**
 * A plain textarea with tab handling. No editor library: adding one needs approval
 * (D38), and for a strategy of a few dozen lines it would be weight without benefit.
 */
export function CodeEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lines = value.split("\n").length;

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    onChange(value.slice(0, start) + "  " + value.slice(end));
    requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
  };

  return (
    <div className="flex border border-rule rounded-md bg-paper overflow-hidden">
      <div
        aria-hidden
        className="select-none py-3 px-2 text-right font-mono text-xs leading-[1.6] text-muted bg-surface border-r border-rule"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        disabled={disabled}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        aria-label="Strategy code"
        className="flex-1 min-h-[320px] p-3 font-mono text-[13px] leading-[1.6] bg-paper text-ink resize-y focus-visible:outline-2 focus-visible:outline-accent"
      />
    </div>
  );
}
