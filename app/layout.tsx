import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Inter } from "next/font/google";

import { CraftedBy } from "@/components/crafted-by";
import { StoreProvider } from "@/lib/stores/store";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perfect DnD",
  description: "Drag and drop made simple",
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
      <body className={`${inter.variable} antialiased`}>
        <StoreProvider>{children}</StoreProvider>
        <footer className="flex justify-center py-6">
          <CraftedBy />
        </footer>
      </body>
      <GoogleAnalytics gaId="G-6LQHMQ7E0H" />
    </html>
  );
}
