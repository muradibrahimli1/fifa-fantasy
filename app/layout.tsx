import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "WC2026 Fantasy Assistant",
  description:
    "Research, optimize, and track your FIFA World Cup 2026 Fantasy team using the official game data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-[var(--muted)]">
          Unofficial assistant. Data from the public FIFA World Cup Fantasy
          feed. Not affiliated with FIFA.
        </footer>
      </body>
    </html>
  );
}
