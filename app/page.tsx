import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight">{PRODUCT_NAME}</h1>
      <p className="mt-3 text-muted">{PRODUCT_TAGLINE}</p>
    </main>
  );
}
