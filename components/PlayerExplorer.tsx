"use client";

import { useMemo, useState } from "react";
import type { Fixture, Nation, Player, Position } from "@/lib/fifa/types";
import { PosBadge, money } from "./ui";
import { PlayerDetail } from "./PlayerDetail";

type SortKey =
  | "projectedPoints"
  | "totalPoints"
  | "form"
  | "price"
  | "valueScore"
  | "ownership";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "projectedPoints", label: "Projected" },
  { key: "totalPoints", label: "Total pts" },
  { key: "form", label: "Form" },
  { key: "valueScore", label: "Value" },
  { key: "price", label: "Price" },
  { key: "ownership", label: "Owned %" },
];

const POSITIONS: (Position | "ALL")[] = ["ALL", "GK", "DEF", "MID", "FWD"];
const PAGE = 60;

export function PlayerExplorer({
  players,
  nations,
  fixtures,
}: {
  players: Player[];
  nations: Nation[];
  fixtures: Fixture[];
}) {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "ALL">("ALL");
  const [nation, setNation] = useState<string>("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(20);
  const [sort, setSort] = useState<SortKey>("projectedPoints");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Player | null>(null);

  const fixtureById = useMemo(() => {
    const m = new Map<number, Fixture>();
    for (const f of fixtures) m.set(f.id, f);
    return m;
  }, [fixtures]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = players.filter((p) => {
      if (onlyAvailable && !p.available) return false;
      if (pos !== "ALL" && p.position !== pos) return false;
      if (nation !== "ALL" && p.nation !== nation) return false;
      if (p.price > maxPrice) return false;
      if (needle && !p.name.toLowerCase().includes(needle) && !p.nation.toLowerCase().includes(needle))
        return false;
      return true;
    });
    list.sort((a, b) => (b[sort] as number) - (a[sort] as number));
    return list;
  }, [players, q, pos, nation, maxPrice, sort, onlyAvailable]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Search player or nation…"
          className="min-w-[180px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent2)]"
        />
        <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => {
                setPos(p);
                setLimit(PAGE);
              }}
              className={`px-2.5 py-1.5 text-xs font-semibold ${
                pos === p
                  ? "bg-[var(--accent2)] text-white"
                  : "bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <select
          value={nation}
          onChange={(e) => {
            setNation(e.target.value);
            setLimit(PAGE);
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5 text-sm outline-none"
        >
          <option value="ALL">All nations</option>
          {nations.map((n) => (
            <option key={n.id} value={n.name}>
              {n.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5 text-sm outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Sort: {s.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
          ≤ {money(maxPrice)}
          <input
            type="range"
            min={4}
            max={20}
            step={0.5}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Available only
        </label>
      </div>

      <div className="text-xs text-[var(--muted)]">
        {filtered.length} players match
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--panel-2)] text-left text-[11px] uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2">Pos</th>
              <th className="px-2 py-2">Next</th>
              <th className="px-2 py-2 text-right">Price</th>
              <th className="px-2 py-2 text-right">Proj</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-2 py-2 text-right">Form</th>
              <th className="px-2 py-2 text-right">Value</th>
              <th className="px-2 py-2 text-right">Own%</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr
                key={p.id}
                onClick={() => setSelected(p)}
                className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--panel-2)]"
              >
                <td className="px-3 py-2">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-[11px] text-[var(--muted)]">
                    {p.nationAbbr}
                    {!p.available && (
                      <span className="ml-1 text-red-400">· out</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <PosBadge position={p.position} />
                </td>
                <td className="px-2 py-2 text-xs text-[var(--muted)]">
                  {p.nextOpponentAbbr
                    ? `${p.nextIsHome ? "" : "@"}${p.nextOpponentAbbr}`
                    : "—"}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {money(p.price)}
                </td>
                <td className="px-2 py-2 text-right font-semibold tabular-nums text-[var(--accent)]">
                  {p.projectedPoints.toFixed(1)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.totalPoints}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {p.form.toFixed(1)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--muted)]">
                  {p.valueScore.toFixed(2)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-[var(--muted)]">
                  {p.ownership.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {limit < filtered.length && (
        <button
          onClick={() => setLimit((l) => l + PAGE)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"
        >
          Show more ({filtered.length - limit} remaining)
        </button>
      )}

      {selected && (
        <PlayerDetail
          player={selected}
          fixtureById={fixtureById}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
