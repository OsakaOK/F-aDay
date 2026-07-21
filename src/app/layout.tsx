import type { Metadata, Viewport } from "next";
import { Fraunces, EB_Garamond, Courier_Prime } from "next/font/google";
import "./globals.css";

// Vintage Atlas type system: an expressive old-style serif for display, a warm
// bookish serif for body, and a typewriter mono for ledger-style numerals.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const body = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
});

const mono = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Flag a Day — daily flag guessing game",
  description:
    "One flag. Three guesses. A new country every day at UTC midnight. Guess the flag, learn something, and share hints with the community.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e9dcc0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:py-10">
          {children}
        </div>
      </body>
    </html>
  );
}
