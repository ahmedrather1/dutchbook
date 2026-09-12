import { chapter1 } from "./ch01";
import { chapter2 } from "./ch02";
import { chapter3 } from "./ch03";
import { chapter4 } from "./ch04";
import { chapter5 } from "./ch05";
import { chapter6 } from "./ch06";
import { chapter7 } from "./ch07";
import { chapter8 } from "./ch08";
import { chapter9 } from "./ch09";
import { chapter10 } from "./ch10";
import { chapter11 } from "./ch11";
import type { Chapter } from "./schema";

/** Curriculum order is locked (D8). Adding a chapter means touching only this list. */
export const CHAPTERS: readonly Chapter[] = [chapter1, chapter2, chapter3, chapter4, chapter5, chapter6, chapter7, chapter8, chapter9, chapter10, chapter11];

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
