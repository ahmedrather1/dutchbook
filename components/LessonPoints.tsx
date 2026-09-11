"use client";

/** Lesson points use **bold** for the term being defined. */
export function LessonPoints({ points, className }: { points: string[]; className?: string }) {
  return (
    <ul className={`space-y-1.5 ${className ?? ""}`}>
      {points.map((point, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
          <span className="text-accent select-none" aria-hidden>
            ·
          </span>
          <span dangerouslySetInnerHTML={{ __html: bold(point) }} />
        </li>
      ))}
    </ul>
  );
}

function bold(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
