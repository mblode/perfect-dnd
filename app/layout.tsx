import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Inter } from "next/font/google";

import { CraftedBy } from "@/components/crafted-by";
import { StoreProvider } from "@/lib/stores/store";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteTitle = "Perfect DnD: drag and drop made simple";
const siteDescription =
  "A dnd-kit demo with the drag, drop, and settle animations tuned until reordering a list feels right.";

export const metadata: Metadata = {
  alternates: {
    canonical: "/perfect-dnd",
  },
  authors: [{ name: "Matthew Blode", url: "https://blode.co" }],
  description: siteDescription,
  metadataBase: new URL("https://blode.co"),
  openGraph: {
    description: siteDescription,
    siteName: "Perfect DnD",
    title: siteTitle,
    type: "website",
    url: "/perfect-dnd",
  },
  title: siteTitle,
  twitter: {
    card: "summary_large_image",
    description: siteDescription,
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
    <html lang="en">
      <head>
        <link href="https://r.blode.co" rel="preconnect" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <StoreProvider>{children}</StoreProvider>
        <footer className="flex justify-center py-6">
          <CraftedBy />
        </footer>
      </body>
    </html>
  );
}
