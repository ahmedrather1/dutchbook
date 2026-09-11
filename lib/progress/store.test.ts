import { describe, it, expect, beforeEach } from "vitest";
import {
  LocalProgressStore, MemoryProgressStore, emptyProgress, exportProgress,
  importProgress, parseProgress, PROGRESS_VERSION, chapterProgress,
} from "./store";

class FakeStorage implements Storage {
  private map = new Map<string, string>();
  failOnSet = false;
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) {
    if (this.failOnSet) throw new DOMException("quota", "QuotaExceededError");
    this.map.set(k, v);
  }
}

let storage: FakeStorage;
let store: LocalProgressStore;

beforeEach(() => {
  storage = new FakeStorage();
  store = new LocalProgressStore(storage);
});

describe("round trip", () => {
  it("saves and reloads progress", () => {
    const progress = emptyProgress();
    progress.chapters.ch1 = { bestScore: 0.9, passed: true, attempts: [], mastery: { a: 1 } };
    store.save(progress);
    expect(store.load().chapters.ch1).toMatchObject({ bestScore: 0.9, passed: true });
  });

  it("starts empty with nothing stored", () => {
    expect(store.load()).toEqual(emptyProgress());
    expect(store.loadOutcome().kind).toBe("empty");
  });
});

describe("unreadable saves degrade instead of crashing (D31)", () => {
  it("reports invalid JSON", () => {
    storage.setItem("dutchbook.progress.v1", "{not json");
    const outcome = store.loadOutcome();
    expect(outcome.kind).toBe("unreadable");
    expect(store.load()).toEqual(emptyProgress());
  });

  it("reports a save from a newer version", () => {
    const outcome = parseProgress(JSON.stringify({ version: 99, chapters: {} }));
    expect(outcome).toMatchObject({ kind: "unreadable" });
    if (outcome.kind === "unreadable") expect(outcome.reason).toMatch(/newer version \(99\)/);
  });

  it("reports a save missing fields", () => {
    expect(parseProgress(JSON.stringify({ nope: 1 })).kind).toBe("unreadable");
  });

  it("migrates an older save forward", () => {
    const outcome = parseProgress(JSON.stringify({ version: 0, chapters: { a: {} } }));
    expect(outcome.kind).toBe("ok");
    if (outcome.kind === "ok") expect(outcome.progress.version).toBe(PROGRESS_VERSION);
  });
});

describe("quota exhaustion", () => {
  it("keeps the game running when the save fails", () => {
    storage.failOnSet = true;
    expect(() => store.save(emptyProgress())).not.toThrow();
  });
});

describe("export and import (D32)", () => {
  it("round-trips through a file", () => {
    const progress = emptyProgress();
    progress.chapters.ch1 = { bestScore: 0.75, passed: false, attempts: [], mastery: {} };
    const outcome = importProgress(exportProgress(progress));
    expect(outcome.kind).toBe("ok");
    if (outcome.kind === "ok") expect(outcome.progress).toEqual(progress);
  });

  it("rejects a malformed file with a reason", () => {
    expect(importProgress("garbage")).toMatchObject({ kind: "unreadable" });
  });
});

describe("chapterProgress", () => {
  it("returns a blank record for an untouched chapter", () => {
    expect(chapterProgress(emptyProgress(), "nope")).toMatchObject({ passed: false, bestScore: 0 });
  });
});

describe("MemoryProgressStore", () => {
  it("behaves like the real one", () => {
    const memory = new MemoryProgressStore();
    const progress = emptyProgress();
    progress.chapters.x = { bestScore: 1, passed: true, attempts: [], mastery: {} };
    memory.save(progress);
    expect(memory.load().chapters.x?.passed).toBe(true);
    memory.clear();
    expect(memory.load().chapters.x).toBeUndefined();
  });
});
