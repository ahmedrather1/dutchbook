import Link from "next/link";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { ChapterMap } from "@/components/ChapterMap";
import { SkillReport } from "@/components/SkillReport";
import { CHAPTERS } from "@/lib/content/registry";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-5xl font-bold tracking-tight">{PRODUCT_NAME}</h1>
      <p className="mt-4 text-lg text-muted max-w-[55ch]">{PRODUCT_TAGLINE}</p>

      <p className="mt-6 max-w-[62ch] leading-relaxed">
        Twelve chapters, each one a short lesson and then a live market you trade against.
        You start by learning what a bid is. You finish writing a scanner that runs against
        markets it has never seen.
      </p>

      <div className="mt-8 flex gap-3 items-center">
        <Link
          href={`/play/${CHAPTERS[0]!.slug}`}
          className="font-mono text-sm px-4 py-2.5 border border-accent rounded bg-raised text-accent hover:bg-accent hover:text-paper focus-visible:outline-2 focus-visible:outline-accent"
        >
          Start chapter 1 →
        </Link>
        <span className="font-mono text-xs text-muted">no signup · nothing to install</span>
      </div>

      <ChapterMap />
      <SkillReport />

      <footer className="mt-16 pt-6 border-t border-rule font-mono text-xs text-muted">
        A simulator, not a trading venue. No real money, no real orders.{" "}
        <a
          href="https://github.com/ahmedrather1/dutchbook"
          className="text-accent hover:underline"
        >
          Source on GitHub
        </a>
      </footer>
    </main>
  );
}
