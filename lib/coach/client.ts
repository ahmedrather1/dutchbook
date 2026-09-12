/**
 * LLM access is bring-your-own-key now, hosted proxy later (D25).
 *
 * The key is stored in localStorage, sent only to Anthropic, and never logged or
 * included in any error report (D26). Swapping in a server proxy means implementing this
 * same interface — nothing above it changes.
 */

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMClient {
  readonly kind: "byok" | "proxy" | "scripted";
  available(): boolean;
  send(system: string, messages: CoachMessage[]): Promise<string>;
}

const KEY_STORAGE = "dutchbook.anthropic.key";
const MODEL = "claude-sonnet-5";

export function readKey(storage: Storage | undefined = safeStorage()): string | null {
  return storage?.getItem(KEY_STORAGE) ?? null;
}

export function writeKey(key: string, storage: Storage | undefined = safeStorage()): void {
  storage?.setItem(KEY_STORAGE, key.trim());
}

export function clearKey(storage: Storage | undefined = safeStorage()): void {
  storage?.removeItem(KEY_STORAGE);
}

function safeStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

/** Calls Anthropic directly from the browser with the player's own key. */
export class BrowserCoachClient implements LLMClient {
  readonly kind = "byok" as const;

  constructor(private readonly getKey: () => string | null = () => readKey()) {}

  available(): boolean {
    return Boolean(this.getKey());
  }

  async send(system: string, messages: CoachMessage[]): Promise<string> {
    const key = this.getKey();
    if (!key) throw new Error("No API key is set.");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages }),
    });

    if (!response.ok) {
      // Deliberately does not include the key or the response body verbatim (D26).
      if (response.status === 401) throw new Error("That API key was rejected.");
      if (response.status === 429) throw new Error("Rate limited by Anthropic. Wait a moment.");
      throw new Error(`The request failed (HTTP ${response.status}).`);
    }

    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();
  }
}

/** Stands in for the hosted proxy (M-4). Same interface, different transport. */
export class ProxyCoachClient implements LLMClient {
  readonly kind = "proxy" as const;
  constructor(private readonly endpoint = "/api/coach") {}

  available(): boolean {
    return true;
  }

  async send(system: string, messages: CoachMessage[]): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system, messages }),
    });
    if (!response.ok) throw new Error(`The coach is unavailable (HTTP ${response.status}).`);
    const data = (await response.json()) as { text?: string };
    return data.text ?? "";
  }
}
