import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Space_Grotesk } from "next/font/google";
import "../styles/tokens.css";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display-loaded",
  display: "swap",
});

const ui = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NIGHTGLASS · Tonight's sky at your location",
  description:
    "Nightglass turns tonight's sky at your location into an explorable constellation map — what you can see and when the clouds will clear.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}