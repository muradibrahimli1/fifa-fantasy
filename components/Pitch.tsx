"use client";

import type { Player, Position } from "@/lib/fifa/types";

interface PitchProps {
  startingXI: Player[];
  bench?: Player[];
  captainId?: number | null;
  viceId?: number | null;
  onRemove?: (id: number) => void;
}

const ROWS: Position[] = ["GK", "DEF", "MID", "FWD"];

export function Pitch({
  startingXI,
  bench = [],
  captainId,
  viceId,
  onRemove,
}: PitchProps) {
  const rows = ROWS.map((pos) => startingXI.filter((p) => p.position === pos));

  return (
    <div>
      <div
        className="space-y-3 rounded-2xl border border-[var(--border)] p-4"
        style={{
          background:
            "radial-gradient(ellipse at top, #14331f 0%, #0c2417 60%, #0a1c12 100%)",
        }}
      >
        {rows.map((row, i) => (
          <div key={ROWS[i]} className="flex flex-wrap justify-center gap-2">
            {row.map((p) => (
              <PlayerChip
                key={p.id}
                player={p}
                isCaptain={p.id === captainId}
                isVice={p.id === viceId}
                onRemove={onRemove}
              />
            ))}
          </div>
        ))}
      </div>

      {bench.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Bench
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
            {bench.map((p) => (
              <PlayerChip key={p.id} player={p} onRemove={onRemove} bench />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerChip({
  player: p,
  isCaptain,
  isVice,
  bench,
  onRemove,
}: {
  player: Player;
  isCaptain?: boolean;
  isVice?: boolean;
  bench?: boolean;
  onRemove?: (id: number) => void;
}) {
  return (
    <div
      className={`relative w-[88px] rounded-lg border px-1.5 py-1.5 text-center ${
        bench
          ? "border-[var(--border)] bg-[var(--panel)]"
          : "border-white/10 bg-black/40 backdrop-blur"
      }`}
    >
      {isCaptain && (
        <span className="absolute -left-1 -top-1 rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-black">
          C
        </span>
      )}
      {isVice && (
        <span className="absolute -left-1 -top-1 rounded-full bg-[var(--accent2)] px-1 text-[9px] font-bold text-white">
          V
        </span>
      )}
      {onRemove && (
        <button
          onClick={() => onRemove(p.id)}
          className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-red-500 text-[10px] leading-none text-white"
          title="Remove"
        >
          ×
        </button>
      )}
      <div className="truncate text-[11px] font-semibold" title={p.name}>
        {p.lastName || p.name}
      </div>
      <div className="text-[9px] text-[var(--muted)]">
        {p.nationAbbr} · {p.position}
      </div>
      <div className="mt-0.5 flex justify-center gap-1 text-[10px]">
        <span className="tabular-nums text-[var(--accent)]">
          {p.projectedPoints.toFixed(1)}
        </span>
        <span className="tabular-nums text-[var(--muted)]">
          ${p.price.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
