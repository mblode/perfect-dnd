import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { CraftedBy } from "@/components/crafted-by";
import { StoreProvider } from "@/lib/stores/store";

// Glide 4.0.2 (https://github.com/mblode/glide). One variable file per style
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

const siteUrl = "https://blode.co/perfect-dnd";
const siteTitle = "Perfect DnD: drag and drop made simple";
const siteDescription =
  "A dnd-kit demo with the drag, drop, and settle animations tuned until reordering a list feels right.";

export const metadata: Metadata = {
  alternates: {
    canonical: siteUrl,
  },
  authors: [{ name: "Matthew Blode", url: "https://blode.co" }],
  creator: "Matthew Blode",
  description: siteDescription,
  // The zone URL, not the bare origin (Rule 11). Only correct because the card
  // is a generated `opengraph-image.tsx` route: Next does not prefix those with
  // `basePath`, so `metadataBase` supplies the prefix exactly once. Against the
  // static PNG this replaced, the two would have stacked into
  // `/perfect-dnd/perfect-dnd/…`.
  metadataBase: new URL(siteUrl),
  // No `images` here: `app/opengraph-image.tsx` is the card. Next reuses it for
  // `twitter:image` too when there is no `twitter-image` file.
  openGraph: {
    description: siteDescription,
    // Every blode.co path shares one site name. The product is already in
    // og:title, so this slot says who made it. See zone-conventions.md Rule 9.
    siteName: "Matthew Blode",
    title: siteTitle,
    type: "website",
    url: siteUrl,
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
