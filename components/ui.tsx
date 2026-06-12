import type { Position } from "@/lib/fifa/types";

export function PosBadge({ position }: { position: Position }) {
  return (
    <span
      className={`pos-${position} inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide`}
    >
      {position}
    </span>
  );
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div
        className={`text-lg font-semibold ${accent ? "text-[var(--accent)]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--panel)] ${className}`}
    >
      {children}
    </div>
  );
}

export function money(n: number): string {
  return `$${n.toFixed(1)}m`;
}
