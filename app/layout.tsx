import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { CraftedBy } from "@/components/crafted-by";
import { StoreProvider } from "@/lib/stores/store";

// Glide 2.0.0 (https://github.com/mblode/glide). One variable file per style
// covers the whole weight axis, so each declares 100-950 rather than a face per
// weight.
const glide = localFont({
  src: [
    { path: "./fonts/glide-variable.woff2", style: "normal" },
    { path: "./fonts/glide-variable-italic.woff2", style: "italic" },
  ],
  variable: "--font-glide",
  weight: "100 950",
  display: "swap",
});

const glideMono = localFont({
  src: "./fonts/glide-mono.woff2",
  variable: "--font-glide-mono",
  weight: "400",
  display: "swap",
});

const siteTitle = "Perfect DnD: drag and drop made simple";
const siteDescription =
  "A dnd-kit demo with the drag, drop, and settle animations tuned until reordering a list feels right.";

export const metadata: Metadata = {
  alternates: {
    canonical: "/perfect-dnd",
  },
  authors: [{ name: "Matthew Blode", url: "https://blode.co" }],
  creator: "Matthew Blode",
  description: siteDescription,
  /*
   * The bare origin, NOT the zone URL, despite zone-conventions.md Rule 11.
   *
   * That rule predates this Next version. Next 16 already prefixes `basePath`
   * onto `app/opengraph-image.png` and onto the relative `canonical` and
   * `openGraph.url` below, so a bare origin resolves all three correctly. Set
   * this to https://blode.co/perfect-dnd and the prefix is applied twice:
   * blode.co/perfect-dnd/perfect-dnd/opengraph-image.png, which is the doubled
   * path `glide` shipped for months. Verified against `npm run build` output,
   * not reasoned about.
   */
  metadataBase: new URL("https://blode.co"),
  openGraph: {
    description: siteDescription,
    // Every blode.co path shares one site name. The product is already in
    // og:title, so this slot says who made it. See zone-conventions.md Rule 9.
    siteName: "Matthew Blode",
    title: siteTitle,
    type: "website",
    url: "/perfect-dnd",
  },
  title: siteTitle,
  twitter: {
    card: "summary_large_image",
    creator: "@mattblode",
    description: siteDescription,
    site: "@mattblode",
    title: siteTitle,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${glide.variable} ${glideMono.variable}`} lang="en">
      <head>
        <link href={process.env.NEXT_PUBLIC_POSTHOG_HOST} rel="preconnect" />
      </head>
      {/*
        Column layout so the footer lands at the bottom of the viewport rather
        than below it: main grows to fill the space, the footer takes its own
        height. Both drag overlays are position: fixed, so neither becomes a
        flex item here. dvh, not vh, so a mobile toolbar cannot hide the footer.
      */}
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <StoreProvider>{children}</StoreProvider>
        <footer className="flex justify-center py-6">
          <CraftedBy />
        </footer>
      </body>
    </html>
  );
}
