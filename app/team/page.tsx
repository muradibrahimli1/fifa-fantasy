"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/fifa/types";
import { pickBestXI, validateSquad } from "@/lib/lineup";
import { STAGES, SQUAD_COMPOSITION } from "@/lib/rules";
import { Pitch } from "@/components/Pitch";
import { PosBadge, Stat, money } from "@/components/ui";

const STORAGE_KEY = "wc2026.myteam.v1";
const CAPTAIN_KEY = "wc2026.myteam.captain.v1";

export default function TeamPage() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [ids, setIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [stageKey, setStageKey] = useState("group");
  const [loaded, setLoaded] = useState(false);
  // Manually chosen captain / vice (null = let the helper auto-pick).
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [viceId, setViceId] = useState<number | null>(null);

  // Load saved squad + captaincy once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIds(JSON.parse(raw));
      const cap = localStorage.getItem(CAPTAIN_KEY);
      if (cap) {
        const { captainId: c, viceId: v } = JSON.parse(cap);
        setCaptainId(c ?? null);
        setViceId(v ?? null);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // Persist on change (after initial load).
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids, loaded]);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(CAPTAIN_KEY, JSON.stringify({ captainId, viceId }));
  }, [captainId, viceId, loaded]);

  useEffect(() => {
    fetch("/api/dataset")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => setPlayers([]));
  }, []);

  const byId = useMemo(
    () => new Map((players ?? []).map((p) => [p.id, p])),
    [players],
  );
  const squad = useMemo(
    () => ids.map((id) => byId.get(id)).filter(Boolean) as Player[],
    [ids, byId],
  );

  const validation = useMemo(
    () => validateSquad(squad, stageKey),
    [squad, stageKey],
  );
  const lineup = useMemo(() => pickBestXI(squad), [squad]);

  // Effective captain/vice: your manual pick if it's still in the squad,
  // otherwise fall back to the helper's auto-pick.
  const captain =
    squad.find((p) => p.id === captainId) ?? lineup.captain ?? null;
  const vice =
    squad.find((p) => p.id === viceId && p.id !== captain?.id) ??
    lineup.viceCaptain ??
    null;

  // FIFA total = every player's points, with the captain's points counted
  // twice (doubled). This mirrors how the official game scores your captain.
  const totalActual =
    squad.reduce((s, p) => s + p.totalPoints, 0) + (captain?.totalPoints ?? 0);
  const projectedXI =
    lineup.startingXI.reduce((s, p) => s + p.projectedPoints, 0) +
    (captain?.projectedPoints ?? 0);

  const searchResults =
    search.trim().length >= 2 && players
      ? players
          .filter(
            (p) =>
              !ids.includes(p.id) &&
              (p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.nation.toLowerCase().includes(search.toLowerCase())),
          )
          .sort((a, b) => b.projectedPoints - a.projectedPoints)
          .slice(0, 8)
      : [];

  function add(id: number) {
    if (ids.length >= 15 || ids.includes(id)) return;
    setIds((prev) => [...prev, id]);
    setSearch("");
  }
  function remove(id: number) {
    setIds((prev) => prev.filter((x) => x !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Team</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Recreate your FIFA Fantasy squad here — it’s saved in your browser.
            Track live points, value, and rule compliance.
          </p>
        </div>
        <label className="text-sm">
          <div className="mb-1 text-xs text-[var(--muted)]">Stage rules</div>
          <select
            value={stageKey}
            onChange={(e) => setStageKey(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none"
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total points" value={totalActual} accent />
        <Stat label="Squad value" value={money(validation.cost)} />
        <Stat
          label="Remaining"
          value={money(validation.remaining)}
        />
        <Stat label="Proj. next" value={projectedXI.toFixed(1)} />
      </div>

      {/* Validation */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {validation.ok ? (
            <span className="text-[var(--accent)]">✓ Squad is legal</span>
          ) : (
            <span className="text-red-400">⚠ Squad needs fixing</span>
          )}
          <span className="text-xs text-[var(--muted)]">
            {squad.length}/15 · GK {validation.composition.GK}/
            {SQUAD_COMPOSITION.GK} · DEF {validation.composition.DEF}/
            {SQUAD_COMPOSITION.DEF} · MID {validation.composition.MID}/
            {SQUAD_COMPOSITION.MID} · FWD {validation.composition.FWD}/
            {SQUAD_COMPOSITION.FWD}
          </span>
        </div>
        {validation.errors.map((e) => (
          <div key={e} className="mt-1 text-xs text-red-400">
            • {e}
          </div>
        ))}
        {validation.warnings.map((w) => (
          <div key={w} className="mt-1 text-xs text-amber-400">
            • {w}
          </div>
        ))}
      </div>

      {/* Add players */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            players
              ? ids.length >= 15
                ? "Squad full — remove a player to add another"
                : "Search to add a player…"
              : "Loading players…"
          }
          disabled={!players || ids.length >= 15}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none disabled:opacity-50"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 divide-y divide-[var(--border)]">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p.id)}
                className="flex w-full items-center justify-between px-1 py-2 text-left text-sm hover:bg-[var(--panel-2)]"
              >
                <span className="flex items-center gap-2">
                  <PosBadge position={p.position} />
                  {p.name}
                  <span className="text-xs text-[var(--muted)]">
                    {p.nationAbbr}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-xs tabular-nums">
                  <span className="text-[var(--accent)]">
                    {p.projectedPoints.toFixed(1)}
                  </span>
                  <span>{money(p.price)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Captaincy */}
      {squad.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm">
              <div className="mb-1 text-xs text-[var(--muted)]">
                Captain <span className="text-[var(--accent)]">(2× points)</span>
              </div>
              <select
                value={captain?.id ?? ""}
                onChange={(e) => setCaptainId(Number(e.target.value) || null)}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none"
              >
                {squad.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.nationAbbr}) · {p.totalPoints} pts
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <div className="mb-1 text-xs text-[var(--muted)]">
                Vice-captain
              </div>
              <select
                value={vice?.id ?? ""}
                onChange={(e) => setViceId(Number(e.target.value) || null)}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm outline-none"
              >
                {squad
                  .filter((p) => p.id !== captain?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.nationAbbr})
                    </option>
                  ))}
              </select>
            </label>
            <button
              onClick={() => {
                setCaptainId(null);
                setViceId(null);
              }}
              className="text-xs text-[var(--muted)] underline hover:text-[var(--text)]"
            >
              Auto-pick
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Set these to match the captain you chose in the official FIFA game so
            your <b>Total points</b> doubles the right player.
          </p>
        </div>
      )}

      {/* Pitch */}
      {squad.length > 0 ? (
        <div>
          <div className="mb-2 text-sm text-[var(--muted)]">
            Suggested XI ({lineup.formation}) · captain{" "}
            <span className="text-[var(--accent)]">{captain?.name ?? "—"}</span>
          </div>
          <Pitch
            startingXI={lineup.startingXI}
            bench={lineup.bench}
            captainId={captain?.id}
            viceId={vice?.id}
            onRemove={remove}
          />
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Your squad is empty. Search above to add your 15 players, or build one
          on the{" "}
          <a href="/optimizer" className="text-[var(--accent)] underline">
            Optimizer
          </a>
          .
        </p>
      )}
    </div>
  );
}
