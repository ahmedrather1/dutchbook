export const PROGRESS_VERSION = 1;

export interface Attempt {
  at: number;
  score: number;
  /** Objective ids that fell short. Drives remediation (F-5). */
  missed: string[];
}

export interface ChapterProgress {
  bestScore: number;
  passed: boolean;
  attempts: Attempt[];
  /** Objective id → 0..1 mastery. */
  mastery: Record<string, number>;
}

export interface Progress {
  version: number;
  chapters: Record<string, ChapterProgress>;
}

export interface ProgressStore {
  load(): Progress;
  save(progress: Progress): void;
  clear(): void;
}

export function emptyProgress(): Progress {
  return { version: PROGRESS_VERSION, chapters: {} };
}

export function chapterProgress(progress: Progress, slug: string): ChapterProgress {
  return progress.chapters[slug] ?? { bestScore: 0, passed: false, attempts: [], mastery: {} };
}

/** A save we cannot read is offered for reset rather than crashing the app (D31). */
export type LoadOutcome =
  | { kind: "ok"; progress: Progress }
  | { kind: "empty" }
  | { kind: "unreadable"; reason: string; raw: string };

export function parseProgress(raw: string | null): LoadOutcome {
  if (raw === null || raw === "") return { kind: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "unreadable", reason: "This save is not valid JSON.", raw };
  }

  if (!isProgressShaped(parsed)) {
    return { kind: "unreadable", reason: "This save is missing expected fields.", raw };
  }
  if (parsed.version > PROGRESS_VERSION) {
    return {
      kind: "unreadable",
      reason: `This save was written by a newer version (${parsed.version}).`,
      raw,
    };
  }
  return { kind: "ok", progress: migrate(parsed) };
}

function isProgressShaped(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.version === "number" && typeof v.chapters === "object" && v.chapters !== null;
}

/** Older saves are upgraded in place. Each step is additive, never destructive. */
function migrate(progress: Progress): Progress {
  return { ...progress, version: PROGRESS_VERSION };
}

const KEY = "dutchbook.progress.v1";

export class LocalProgressStore implements ProgressStore {
  constructor(private readonly storage: Storage) {}

  loadOutcome(): LoadOutcome {
    try {
      return parseProgress(this.storage.getItem(KEY));
    } catch (error) {
      return { kind: "unreadable", reason: String(error), raw: "" };
    }
  }

  load(): Progress {
    const outcome = this.loadOutcome();
    return outcome.kind === "ok" ? outcome.progress : emptyProgress();
  }

  save(progress: Progress): void {
    try {
      this.storage.setItem(KEY, JSON.stringify(progress));
    } catch {
      // Out of quota or private browsing: progress is lost, but the game keeps working.
    }
  }

  clear(): void {
    this.storage.removeItem(KEY);
  }
}

/** Used on the server and in tests, where there is no localStorage. */
export class MemoryProgressStore implements ProgressStore {
  private progress = emptyProgress();

  load(): Progress {
    return this.progress;
  }

  save(progress: Progress): void {
    this.progress = progress;
  }

  clear(): void {
    this.progress = emptyProgress();
  }
}

export function exportProgress(progress: Progress): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(json: string): LoadOutcome {
  return parseProgress(json);
}
