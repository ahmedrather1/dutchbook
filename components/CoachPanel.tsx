"use client";

import { useState } from "react";
import { Button } from "./Terminal";
import { respond } from "@/lib/coach/coach";
import { BrowserCoachClient, clearKey, readKey, writeKey, type CoachMessage } from "@/lib/coach/client";

/** The coach that will not do your thinking for you (D23). */
export function CoachPanel({ onCode }: { onCode: (code: string) => void }) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(() => Boolean(readKey()));

  const send = async () => {
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setDraft("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    const reply = await respond(message, {
      client: hasKey ? new BrowserCoachClient() : undefined,
      history: messages,
    });
    setMessages((prev) => [...prev, { role: "assistant", content: reply.text }]);
    setBusy(false);
  };

  return (
    <div className="border border-rule rounded-md bg-surface overflow-hidden">
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted border-b border-rule bg-raised flex justify-between">
        <span>Coach</span>
        <span>{hasKey ? "your key" : "no key · scripted"}</span>
      </div>

      <div className="p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted leading-relaxed">
            Describe the strategy you want, in your own words. I need four things before I
            will write anything: <strong className="text-ink">entry</strong>,{" "}
            <strong className="text-ink">sizing</strong>, <strong className="text-ink">exit</strong>,
            and the <strong className="text-ink">risk</strong> you are accepting. I will not
            tell you where the arbitrage is.
          </p>
        )}

        <div className="space-y-3 max-h-72 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-ink" : "text-muted"}>
              <div className="text-[10px] uppercase tracking-wider text-muted mb-0.5">
                {m.role === "user" ? "you" : "coach"}
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.content}</pre>
              {m.role === "assistant" && m.content.includes("function onTick") && (
                <button
                  onClick={() => onCode(extractCode(m.content))}
                  className="mt-1 font-mono text-xs text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  paste into the editor →
                </button>
              )}
            </div>
          ))}
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="I want to enter when… size… exit when… the risk I'm accepting is…"
          aria-label="Message to the coach"
          className="w-full h-24 p-2 text-sm bg-paper border border-rule rounded text-ink resize-y focus-visible:outline-2 focus-visible:outline-accent"
        />

        <div className="flex gap-2">
          <Button onClick={send} disabled={busy || draft.trim().length === 0}>
            {busy ? "Thinking…" : "Send"}
          </Button>
        </div>

        {!hasKey ? (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer hover:text-accent">Use your own Anthropic key</summary>
            <p className="mt-2 leading-relaxed">
              Stored in this browser only and sent to nobody but Anthropic. Note that a key held
              in a web page is visible to that page — use a key you are willing to rotate.
            </p>
            <div className="flex gap-2 mt-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-ant-…"
                aria-label="Anthropic API key"
                className="flex-1 px-2 py-1 font-mono text-xs bg-paper border border-rule rounded text-ink"
              />
              <Button
                onClick={() => {
                  writeKey(keyInput);
                  setKeyInput("");
                  setHasKey(true);
                }}
              >
                Save
              </Button>
            </div>
          </details>
        ) : (
          <button
            onClick={() => {
              clearKey();
              setHasKey(false);
            }}
            className="text-xs text-muted hover:text-ask focus-visible:outline-2 focus-visible:outline-accent"
          >
            remove my key
          </button>
        )}
      </div>
    </div>
  );
}

function extractCode(text: string): string {
  const fenced = text.match(/```(?:js|javascript)?\n([\s\S]*?)```/);
  return (fenced?.[1] ?? text).trim();
}
