"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LocalProgressStore, MemoryProgressStore, emptyProgress,
  type Progress, type ProgressStore,
} from "@/lib/progress/store";

let store: ProgressStore | null = null;
const listeners = new Set<(p: Progress) => void>();

function getStore(): ProgressStore {
  store ??=
    typeof window === "undefined"
      ? new MemoryProgressStore()
      : new LocalProgressStore(window.localStorage);
  return store;
}

/**
 * Progress is read after mount, not during render: the server has no localStorage, so
 * rendering it directly would mismatch on hydration.
 */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);

  useEffect(() => {
    // Reading storage after mount is the point: the server cannot, so doing it during
    // render would mismatch on hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(getStore().load());
    listeners.add(setProgress);
    return () => {
      listeners.delete(setProgress);
    };
  }, []);

  const update = useCallback((next: Progress) => {
    getStore().save(next);
    listeners.forEach((notify) => notify(next));
  }, []);

  const reset = useCallback(() => {
    getStore().clear();
    listeners.forEach((notify) => notify(emptyProgress()));
  }, []);

  return { progress, update, reset };
}
