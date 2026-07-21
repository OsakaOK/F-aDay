import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flag a Day — daily flag guessing game",
  description:
    "One flag. Three guesses. A new country every day at UTC midnight. Guess the flag, learn something, and share hints with the community.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:py-10">
          {children}
        </div>
      </body>
    </html>
  );
}
