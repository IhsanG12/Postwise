import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import Toaster from "@/components/ui/Toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Postwise",
  description: "Turn an idea into a ready-to-post TikTok or Instagram carousel: slides, text, captions, hashtags and a sound.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
