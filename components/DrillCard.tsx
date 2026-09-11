"use client";

import { useState } from "react";
import { OrderBook } from "./OrderBook";
import { Button } from "./Terminal";
import { formatPrice, ticks } from "@/lib/engine/money";
import type { Drill } from "@/lib/content/schema";

export interface DrillCardProps {
  drill: Drill;
  index: number;
  total: number;
  onAnswered: (correct: boolean) => void;
}

export function DrillCard({ drill, index, total, onAnswered }: DrillCardProps) {
  const [answer, setAnswer] = useState<string>("");
  const [result, setResult] = useState<"right" | "wrong" | null>(null);

  const submit = (correct: boolean) => {
    if (result) return;
    setResult(correct ? "right" : "wrong");
    onAnswered(correct);
  };

  return (
    <div data-drill={index} className="border border-rule rounded-md bg-surface overflow-hidden">
      <div className="flex justify-between px-4 py-2 text-[10px] uppercase tracking-wider text-muted bg-raised border-b border-rule">
        <span>Drill {index + 1} of {total}</span>
        {result && (
          <span className={result === "right" ? "text-bid" : "text-ask"}>
            {result === "right" ? "✓ correct" : "✗ not quite"}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        <p className="text-[15px]">{drill.prompt}</p>

        {drill.kind === "book-read" && (
          <div className="max-w-xs">
            <OrderBook
              bids={toLevels(drill.book, "buy")}
              asks={toLevels(drill.book, "sell")}
              levels={3}
            />
          </div>
        )}

        {drill.kind === "choice" ? (
          <div className="grid gap-2">
            {drill.options.map((option, i) => (
              <button
                key={option}
                disabled={result !== null}
                onClick={() => submit(i === drill.answerIndex)}
                className={`text-left text-[15px] px-3 py-2 border rounded focus-visible:outline-2 focus-visible:outline-accent ${optionClass(
                  result,
                  i,
                  drill.answerIndex,
                )}`}
              >
                <span className="font-mono text-xs text-muted mr-2">
                  {result !== null && i === drill.answerIndex ? "✓" : "abcd"[i]}
                </span>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(isNumericCorrect(drill, answer));
            }}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              inputMode="decimal"
              value={answer}
              disabled={result !== null}
              onChange={(e) => setAnswer(e.target.value)}
              aria-label="Your answer"
              className="w-28 font-mono tabular-nums text-sm px-2 py-1.5 bg-paper border border-rule rounded text-ink focus-visible:outline-2 focus-visible:outline-accent"
            />
            {drill.kind === "numeric" && drill.unit && (
              <span className="font-mono text-xs text-muted">{drill.unit}</span>
            )}
            <Button onClick={() => submit(isNumericCorrect(drill, answer))} disabled={result !== null}>
              Check
            </Button>
          </form>
        )}

        {result && (
          <p className="text-sm text-muted leading-relaxed border-t border-rule pt-3">
            {result === "wrong" && <strong className="text-ink">{correctAnswer(drill)} </strong>}
            {drill.explanation}
          </p>
        )}
      </div>
    </div>
  );
}

function optionClass(result: "right" | "wrong" | null, i: number, answerIndex: number) {
  if (result === null) return "border-rule hover:border-accent";
  if (i === answerIndex) return "border-bid bg-bid/10 text-ink";
  return "border-rule text-muted";
}

function toLevels(book: { side: "buy" | "sell"; price: number; qty: number }[], side: "buy" | "sell") {
  return book
    .filter((l) => l.side === side)
    .sort((a, b) => (side === "buy" ? b.price - a.price : a.price - b.price))
    .map((l) => ({ price: ticks(l.price), qty: l.qty, orders: [] }));
}

function isNumericCorrect(drill: Drill, raw: string): boolean {
  const value = Number(raw.replace(/[$%,¢\s]/g, ""));
  if (!Number.isFinite(value)) return false;
  if (drill.kind === "numeric") return Math.abs(value - drill.answer) <= drill.tolerance;
  if (drill.kind === "book-read") {
    // Book answers are in ticks; accept dollars (0.64) or cents (64) too.
    return [drill.answer, drill.answer / 1000, drill.answer / 10].some(
      (accepted) => Math.abs(value - accepted) < 1e-6,
    );
  }
  return false;
}

function correctAnswer(drill: Drill): string {
  if (drill.kind === "choice") return `The answer is "${drill.options[drill.answerIndex]}".`;
  if (drill.kind === "numeric") return `The answer is ${drill.answer}${drill.unit ?? ""}.`;
  return `The answer is ${formatPrice(ticks(drill.answer))}.`;
}
