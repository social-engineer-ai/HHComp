import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supply Chain Case Competition 2026 — Horizon Hobby x Gies",
  description:
    "The Gies College of Business Supply Chain Case Competition, presented by Horizon Hobby. Forecast replacement-part demand, win cash prizes, present to industry judges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
