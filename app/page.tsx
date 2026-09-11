import Link from "next/link";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { CHAPTERS, PLANNED_TITLES } from "@/lib/content/registry";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-5xl font-bold tracking-tight">{PRODUCT_NAME}</h1>
      <p className="mt-4 text-lg text-muted max-w-[55ch]">{PRODUCT_TAGLINE}</p>

      <ol className="mt-12 border-t border-rule">
        {PLANNED_TITLES.map((title, i) => {
          const chapter = CHAPTERS.find((c) => c.number === i + 1);
          return (
            <li key={title} className="border-b border-rule">
              {chapter ? (
                <Link
                  href={`/play/${chapter.slug}`}
                  className="flex items-baseline gap-4 py-3 group focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="font-mono text-xs text-muted tabular-nums w-8">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium group-hover:text-accent">{title}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-accent">
                    ready
                  </span>
                </Link>
              ) : (
                <div className="flex items-baseline gap-4 py-3 text-muted">
                  <span className="font-mono text-xs tabular-nums w-8">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{title}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wider">
                    not built
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
