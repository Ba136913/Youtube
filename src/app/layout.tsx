import type { Metadata } from "next";
import { Inter, Instrument_Serif, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-suisse",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-perfectly",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-bitcount",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sector Scope - Live NSE Sector Analytics",
  description: "Real-time NSE sector heatmap and stock analysis for professional traders. Track bullish and bearish momentum across all sectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${geistMono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
