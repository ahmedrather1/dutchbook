import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHAPTERS, getChapter } from "@/lib/content/registry";
import { ChapterView } from "./ChapterView";

// The Chapter object holds functions (scenario agents, drill generators), so it cannot
// cross the server/client boundary. Only the slug is passed; the view looks it up.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chapter = getChapter(slug);
  return chapter ? { title: chapter.title, description: chapter.teaches } : {};
}

export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) notFound();
  return <ChapterView slug={chapter.slug} />;
}
