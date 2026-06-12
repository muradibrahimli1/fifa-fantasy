"use client";

import type { Fixture, Player } from "@/lib/fifa/types";
import { PosBadge, money } from "./ui";

export function PlayerDetail({
  player: p,
  fixtureById,
  onClose,
}: {
  player: Player;
  fixtureById: Map<number, Fixture>;
  onClose: () => void;
}) {
  const next = p.nextFixtureId ? fixtureById.get(p.nextFixtureId) : null;
  const rounds = Object.entries(p.roundPoints)
    .map(([r, pts]) => ({ r: Number(r), pts }))
    .sort((a, b) => a.r - b.r);
  const maxPts = Math.max(1, ...rounds.map((x) => Math.abs(x.pts)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PosBadge position={p.position} />
              <span className="text-xs text-[var(--muted)]">
                {p.nation} ({p.nationAbbr})
                {p.group ? ` · Group ${p.group.toUpperCase()}` : ""}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-bold">{p.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[var(--muted)] hover:bg-[var(--panel-2)]"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          <Mini label="Price" value={money(p.price)} />
          <Mini label="Proj" value={p.projectedPoints.toFixed(1)} accent />
          <Mini label="Total" value={String(p.totalPoints)} />
          <Mini label="Form" value={p.form.toFixed(1)} />
          <Mini label="Avg" value={p.avgPoints.toFixed(1)} />
          <Mini label="Last" value={String(p.lastRoundPoints)} />
          <Mini label="Value" value={p.valueScore.toFixed(2)} />
          <Mini label="Owned" value={`${p.ownership.toFixed(1)}%`} />
        </div>

        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Next fixture
          </div>
          {next ? (
            <div className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm">
              {p.nextIsHome ? (
                <>
                  <b>{next.homeAbbr}</b> vs {next.awayAbbr}
                </>
              ) : (
                <>
                  {next.homeAbbr} vs <b>{next.awayAbbr}</b>
                </>
              )}
              <span className="ml-2 text-xs text-[var(--muted)]">
                Round {next.roundId} ·{" "}
                {new Date(next.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ) : (
            <div className="mt-1 text-sm text-[var(--muted)]">
              No upcoming fixture (team may be eliminated or between rounds).
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">
            Points by round
          </div>
          {rounds.length ? (
            <div className="mt-2 flex items-end gap-2">
              {rounds.map((x) => (
                <div key={x.r} className="flex flex-1 flex-col items-center gap-1">
                  <div className="text-xs font-semibold tabular-nums">
                    {x.pts}
                  </div>
                  <div
                    className="w-full rounded-t bg-[var(--accent)]"
                    style={{
                      height: `${(Math.abs(x.pts) / maxPts) * 60 + 4}px`,
                      opacity: x.pts < 0 ? 0.4 : 1,
                    }}
                  />
                  <div className="text-[10px] text-[var(--muted)]">R{x.r}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-sm text-[var(--muted)]">
              No points recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5">
      <div className="text-[10px] uppercase text-[var(--muted)]">{label}</div>
      <div className={`text-sm font-semibold ${accent ? "text-[var(--accent)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}
