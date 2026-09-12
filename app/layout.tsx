import type { Metadata } from "next";
import { PRODUCT_NAME, PRODUCT_TAGLINE, SITE_URL } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` },
  description: PRODUCT_TAGLINE,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: PRODUCT_NAME,
    description: PRODUCT_TAGLINE,
    type: "website",
    url: SITE_URL,
  },
  twitter: { card: "summary_large_image", title: PRODUCT_NAME, description: PRODUCT_TAGLINE },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
