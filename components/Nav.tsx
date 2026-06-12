"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/optimizer", label: "Optimizer" },
  { href: "/team", label: "My Team" },
  { href: "/advisor", label: "Advisor" },
  { href: "/rules", label: "Rules" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-4 flex items-center gap-2 font-bold">
          <span className="text-xl">⚽</span>
          <span className="hidden sm:inline">
            WC2026 <span className="text-[var(--accent)]">Fantasy</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--panel-2)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
