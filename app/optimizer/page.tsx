"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/fifa/types";
import type { OptimizedSquad } from "@/lib/optimizer";
import { STAGES } from "@/lib/rules";
import { Pitch } from "@/components/Pitch";
import { Stat, money } from "@/components/ui";

export default function OptimizerPage() {
  const [stageKey, setStageKey] = useState("group");
  const [budget, setBudget] = useState(100);
  const [result, setResult] = useState<OptimizedSquad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock/exclude support (loaded lazily for the search box).
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [lockIds, setLockIds] = useState<number[]>([]);
  const [excludeIds, setExcludeIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Keep budget in sync with the stage default the first time a stage is chosen.
  function onStage(key: string) {
    setStageKey(key);
    const s = STAGES.find((x) => x.key === key);
    if (s) setBudget(s.budget);
  }

  useEffect(() => {
    if (showAdvanced && !players) {
      fetch("/api/dataset")
        .then((r) => r.json())
        .then((d) => setPlayers(d.players ?? []))
        .catch(() => setPlayers([]));
    }
  }, [showAdvanced, players]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageKey, budget, lockIds, excludeIds }),
      });
      const data = (await res.json()) as OptimizedSquad & { error?: string };
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (!data.feasible) setError(data.reason ?? "No feasible squad found.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setLoading(false);
    }
  }

  const byId = new Map((players ?? []).map((p) => [p.id, p]));
  const searchResults =
    search.trim().length >= 2 && players
      ? players
          .filter(
            (p) =>
              p.available &&
              p.name.toLowerCase().includes(search.toLowerCase()),
          )
          .slice(0, 6)
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Squad Optimizer</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Builds the highest projected-points 15 within budget, respecting squad
          shape, the per-nation cap for the stage, and a legal formation. Picks
          your captain too.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <label className="text-sm">
          <div className="mb-1 text-xs text-[var(--muted)]">Stage</div>
          <select
            value={stageKey}
            onChange={(e) => onStage(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none"
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} · max {s.maxPerNation}/nation
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <div className="mb-1 text-xs text-[var(--muted)]">
            Budget: {money(budget)}
          </div>
          <input
            type="range"
            min={80}
            max={120}
            step={0.5}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-48"
          />
        </label>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Optimizing…" : "Optimize squad"}
        </button>
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="text-xs text-[var(--muted)] underline hover:text-[var(--text)]"
        >
          {showAdvanced ? "Hide" : "Lock / exclude players"}
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              players ? "Search a player to lock/exclude…" : "Loading players…"
            }
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none"
          />
          {searchResults.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-xs"
                >
                  <span>
                    {p.name} ({p.nationAbbr})
                  </span>
                  <button
                    onClick={() => {
                      setLockIds((l) => [...new Set([...l, p.id])]);
                      setExcludeIds((x) => x.filter((id) => id !== p.id));
                    }}
                    className="rounded bg-[var(--accent)] px-1.5 font-bold text-black"
                  >
                    Lock
                  </button>
                  <button
                    onClick={() => {
                      setExcludeIds((x) => [...new Set([...x, p.id])]);
                      setLockIds((l) => l.filter((id) => id !== p.id));
                    }}
                    className="rounded bg-red-500 px-1.5 font-bold text-white"
                  >
                    Ban
                  </button>
                </div>
              ))}
            </div>
          )}
          <ChipRow
            label="Locked"
            ids={lockIds}
            byId={byId}
            color="var(--accent)"
            onClear={(id) => setLockIds((l) => l.filter((x) => x !== id))}
          />
          <ChipRow
            label="Excluded"
            ids={excludeIds}
            byId={byId}
            color="#ef4444"
            onClear={(id) => setExcludeIds((x) => x.filter((i) => i !== id))}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {error}
        </div>
      )}

      {result?.feasible && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <Pitch
              startingXI={result.startingXI}
              bench={result.bench}
              captainId={result.captain?.id}
              viceId={result.viceCaptain?.id}
            />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="Proj. points"
                value={result.projectedPoints.toFixed(1)}
                accent
              />
              <Stat label="Formation" value={result.formation} />
              <Stat label="Squad cost" value={money(result.totalCost)} />
              <Stat label="Remaining" value={money(result.remaining)} />
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 text-sm">
              <div className="text-xs text-[var(--muted)]">Captain</div>
              <div className="font-semibold text-[var(--accent)]">
                {result.captain?.name} ({result.captain?.nationAbbr}) —{" "}
                {((result.captain?.projectedPoints ?? 0) * 2).toFixed(1)} pts
              </div>
              <div className="mt-2 text-xs text-[var(--muted)]">
                Vice: {result.viceCaptain?.name}
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Projection includes the captain’s doubled score. Bench is filled
              cheaply since bench players only score via auto-substitution.
            </p>
          </div>
        </div>
      )}

      {!result && !loading && (
        <p className="text-sm text-[var(--muted)]">
          Choose a stage and hit <b>Optimize squad</b> to generate your best XI.
        </p>
      )}
    </div>
  );
}

function ChipRow({
  label,
  ids,
  byId,
  color,
  onClear,
}: {
  label: string;
  ids: number[];
  byId: Map<number, Player>;
  color: string;
  onClear: (id: number) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[var(--muted)]">{label}:</span>
      {ids.map((id) => (
        <button
          key={id}
          onClick={() => onClear(id)}
          className="rounded-full px-2 py-0.5 text-xs font-medium text-black"
          style={{ background: color }}
        >
          {byId.get(id)?.name ?? `#${id}`} ✕
        </button>
      ))}
    </div>
  );
}
