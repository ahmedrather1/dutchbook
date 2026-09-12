import type { Metadata } from "next";
import Link from "next/link";
import { GuideBody } from "./GuideBody";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "How it works",
  description: `How ${PRODUCT_NAME} is built: the layers, the invariants, and how to add a chapter.`,
};

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/"
        className="font-mono text-[11px] text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        ← Back
      </Link>
      <h1 className="text-4xl font-bold tracking-tight mt-3">How it works</h1>
      <p className="mt-3 text-muted max-w-[62ch] leading-relaxed">
        A guide to the code behind the game: what each layer owns, what it is forbidden to
        do, and why. Every path here is checked by a test, so this page cannot drift away
        from the code it describes.
      </p>
      <GuideBody />
    </main>
  );
}
