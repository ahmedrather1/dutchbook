import type { Chapter } from "@/lib/content/schema";
import { chapterProgress, type Progress } from "@/lib/progress/store";

export type ChapterState = "locked" | "available" | "passed";

/**
 * A chapter unlocks when the previous one is passed. Locked chapters still advertise
 * what they teach and what unlocks them (D12), so this never hides the map.
 */
export function chapterState(
  progress: Progress,
  chapters: readonly Chapter[],
  chapter: Chapter,
): ChapterState {
  if (chapterProgress(progress, chapter.slug).passed) return "passed";

  const previous = chapters.find((c) => c.number === chapter.number - 1);
  if (!previous) return "available";
  return chapterProgress(progress, previous.slug).passed ? "available" : "locked";
}

export function unlockRequirement(chapters: readonly Chapter[], chapter: Chapter): string | undefined {
  const previous = chapters.find((c) => c.number === chapter.number - 1);
  return previous ? `Pass chapter ${previous.number}: ${previous.title}` : undefined;
}
