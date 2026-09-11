"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  LocalProgressStore, MemoryProgressStore, emptyProgress,
  type Progress, type ProgressStore,
} from "@/lib/progress/store";

let store: ProgressStore | null = null;
let cached: Progress | null = null;
const listeners = new Set<() => void>();

function getStore(): ProgressStore {
  if (store) return store;
  store =
    typeof window === "undefined"
      ? new MemoryProgressStore()
      : new LocalProgressStore(window.localStorage);
  return store;
}

function getSnapshot(): Progress {
  cached ??= getStore().load();
  return cached;
}

const SERVER_SNAPSHOT = emptyProgress();

export function useProgress() {
  const progress = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const update = useCallback((next: Progress) => {
    cached = next;
    getStore().save(next);
    listeners.forEach((fn) => fn());
  }, []);

  const reset = useCallback(() => {
    cached = emptyProgress();
    getStore().clear();
    listeners.forEach((fn) => fn());
  }, []);

  return { progress, update, reset };
}
