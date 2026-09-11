import { chapter1 } from "./ch01";
import { chapter2 } from "./ch02";
import type { Chapter } from "./schema";

/** Curriculum order is locked (D8). Adding a chapter means touching only this list. */
export const CHAPTERS: readonly Chapter[] = [chapter1, chapter2];

/** Every chapter in D8, including the ones not yet written. Drives the chapter map. */
export const PLANNED_TITLES: readonly string[] = [
  "Markets & price-as-probability",
  "Orders & fills",
  "Probability & expected value",
  "Prediction markets",
  "Frictions",
  "ARB I — Dutch book",
  "ARB II — Cross-venue",
  "ARB III — Logical & correlated",
  "ARB IV — Temporal",
  "Risk & sizing",
  "Execution",
  "Capstone — Strategy sandbox",
];

export function getChapter(slug: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}

export function chapterByNumber(n: number): Chapter | undefined {
  return CHAPTERS.find((c) => c.number === n);
}
