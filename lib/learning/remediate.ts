import type { Chapter, Drill, DrillTemplate, Lesson } from "@/lib/content/schema";

export interface Remediation {
  objectives: string[];
  /** Only the lessons that teach the missed objectives — never the whole chapter (D10). */
  lessons: Lesson[];
  drills: (Drill | DrillTemplate)[];
}

/**
 * Given what fell short, pick the material that addresses it and nothing else.
 * Drills the player has already seen are deprioritised, not excluded — there may be
 * nothing else covering that objective.
 */
export function selectRemediation(
  chapter: Chapter,
  missed: readonly string[],
  seenDrillIds: readonly string[] = [],
): Remediation {
  const targets = new Set(missed);
  if (targets.size === 0) return { objectives: [], lessons: [], drills: [] };

  const lessons = chapter.lessons.filter((lesson) =>
    lesson.objectives.some((id) => targets.has(id)),
  );

  const relevant = chapter.drills.filter((drill) =>
    drill.objectives.some((id) => targets.has(id)),
  );
  const seen = new Set(seenDrillIds);
  const unseen = relevant.filter((d) => !seen.has(d.id));

  return {
    objectives: [...targets],
    lessons,
    drills: unseen.length > 0 ? unseen : relevant,
  };
}
