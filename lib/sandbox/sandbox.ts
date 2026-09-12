import type { Action, StrategyContext } from "./api";

/**
 * Runs player code in a Web Worker (D28).
 *
 * The worker has no DOM and no network: fetch, XMLHttpRequest, WebSocket and
 * importScripts are deleted before the code is compiled. A watchdog on this side
 * terminates a worker that overruns its budget, so an infinite loop cannot freeze the
 * page — the worker cannot be interrupted from inside, which is the whole reason the
 * player's code does not run on the main thread.
 */

export const TICK_BUDGET_MS = 250;
export const COMPILE_BUDGET_MS = 2000;

const WORKER_SOURCE = `
self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.importScripts = undefined;
self.EventSource = undefined;

let strategy = null;

self.onmessage = (event) => {
  const msg = event.data;

  if (msg.kind === "compile") {
    try {
      // Indirect construction keeps the player's code out of this scope.
      const factory = new Function(msg.code + "\\nreturn typeof onTick === 'function' ? onTick : null;");
      strategy = factory();
      if (typeof strategy !== "function") {
        self.postMessage({ kind: "compiled", ok: false, error: "No function named onTick was defined." });
        return;
      }
      self.postMessage({ kind: "compiled", ok: true });
    } catch (err) {
      self.postMessage({ kind: "compiled", ok: false, error: String(err && err.message ? err.message : err) });
    }
    return;
  }

  if (msg.kind === "tick") {
    if (!strategy) {
      self.postMessage({ kind: "result", id: msg.id, error: "Strategy is not compiled." });
      return;
    }
    const logs = [];
    const ctx = Object.assign({}, msg.ctx, {
      log: (...args) => { if (logs.length < 50) logs.push(args.map(String).join(" ")); },
    });
    try {
      const actions = strategy(ctx);
      self.postMessage({ kind: "result", id: msg.id, actions: actions ?? null, logs, memory: ctx.memory });
    } catch (err) {
      self.postMessage({
        kind: "result",
        id: msg.id,
        error: String(err && err.message ? err.message : err),
        logs,
      });
    }
  }
};
`;

export interface TickResult {
  actions: Action | Action[] | null;
  logs: string[];
  memory: Record<string, unknown>;
  error?: string;
}

export class StrategySandbox {
  private worker: Worker | null = null;
  private nextId = 0;

  async compile(code: string): Promise<{ ok: boolean; error?: string }> {
    this.terminate();
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);
    URL.revokeObjectURL(url);

    return this.request({ kind: "compile", code }, COMPILE_BUDGET_MS)
      .then((msg) => ({ ok: Boolean(msg.ok), error: msg.error as string | undefined }))
      .catch((error: Error) => ({ ok: false, error: error.message }));
  }

  async tick(ctx: Omit<StrategyContext, "log">): Promise<TickResult> {
    const id = ++this.nextId;
    try {
      const msg = await this.request({ kind: "tick", id, ctx }, TICK_BUDGET_MS);
      return {
        actions: (msg.actions as Action | Action[] | null) ?? null,
        logs: (msg.logs as string[]) ?? [],
        memory: (msg.memory as Record<string, unknown>) ?? {},
        error: msg.error as string | undefined,
      };
    } catch (error) {
      // A timeout means the worker is stuck; it cannot be recovered, only replaced.
      this.terminate();
      return {
        actions: null,
        logs: [],
        memory: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  get isRunning(): boolean {
    return this.worker !== null;
  }

  private request(payload: unknown, budgetMs: number): Promise<Record<string, unknown>> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error("Sandbox is not running."));

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Your code ran longer than ${budgetMs}ms and was stopped.`));
      }, budgetMs);

      const onMessage = (event: MessageEvent) => {
        cleanup();
        resolve(event.data as Record<string, unknown>);
      };
      const onError = (event: ErrorEvent) => {
        cleanup();
        reject(new Error(event.message || "Your code failed to run."));
      };
      const cleanup = () => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      };

      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.postMessage(payload);
    });
  }
}
