import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { ChapterMap } from "@/components/ChapterMap";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-5xl font-bold tracking-tight">{PRODUCT_NAME}</h1>
      <p className="mt-4 text-lg text-muted max-w-[55ch]">{PRODUCT_TAGLINE}</p>
      <ChapterMap />
    </main>
  );
}
