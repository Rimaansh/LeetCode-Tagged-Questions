import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { SITE_NAME } from "@/lib/brand";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const instrument = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: SITE_NAME,
  description:
    "Filter coding interview questions by company, timeframe, difficulty, and topics — track what you have solved.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} ${dmSans.variable} ${instrument.variable}`}>
        {children}
      </body>
    </html>
  );
}
