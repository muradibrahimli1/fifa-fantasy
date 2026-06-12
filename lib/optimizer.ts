import solver from "javascript-lp-solver";
import type { Player, Position } from "./fifa/types";
import {
  DEFAULT_STAGE,
  FORMATIONS,
  SQUAD_COMPOSITION,
  STAGES,
  formationCounts,
} from "./rules";

export interface OptimizeOptions {
  stageKey?: string; // group | r16 | qf | sf | final
  budget?: number; // override stage budget
  lockIds?: number[]; // players that MUST be in the squad
  excludeIds?: number[]; // players that must NOT be selected
}

export interface OptimizedSquad {
  feasible: boolean;
  reason?: string;
  startingXI: Player[];
  bench: Player[];
  captain: Player | null;
  viceCaptain: Player | null;
  formation: string;
  totalCost: number;
  budget: number;
  remaining: number;
  projectedPoints: number; // XI total incl. captain doubling
}

const POSITIONS: Position[] = ["GK", "DEF", "MID", "FWD"];

// Keep the ILP small & fast: per position, take the top candidates by projected
// points plus the cheapest few (needed for budget flexibility & bench fillers).
// The optimum is overwhelmingly within this pool.
function buildPool(players: Player[], excludeIds: Set<number>): Player[] {
  const byPos: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) {
    if (!p.available) continue;
    if (excludeIds.has(p.id)) continue;
    byPos[p.position].push(p);
  }
  const topN: Record<Position, number> = { GK: 16, DEF: 70, MID: 70, FWD: 50 };
  const cheapN: Record<Position, number> = { GK: 8, DEF: 18, MID: 18, FWD: 12 };

  const pool = new Map<number, Player>();
  for (const pos of POSITIONS) {
    const list = byPos[pos];
    [...list]
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .slice(0, topN[pos])
      .forEach((p) => pool.set(p.id, p));
    [...list]
      .sort((a, b) => a.price - b.price)
      .slice(0, cheapN[pos])
      .forEach((p) => pool.set(p.id, p));
  }
  return [...pool.values()];
}

export function optimizeSquad(
  players: Player[],
  opts: OptimizeOptions = {},
): OptimizedSquad {
  const stage = STAGES.find((s) => s.key === opts.stageKey) ?? DEFAULT_STAGE;
  const budget = opts.budget ?? stage.budget;
  const maxPerNation = stage.maxPerNation;
  const excludeIds = new Set(opts.excludeIds ?? []);
  const lockIds = new Set((opts.lockIds ?? []).filter((id) => !excludeIds.has(id)));

  const byId = new Map(players.map((p) => [p.id, p]));
  // Candidate pool = top/cheap players, plus any locked players (which might not
  // otherwise make the shortlist).
  const poolMap = new Map(buildPool(players, excludeIds).map((p) => [p.id, p]));
  for (const id of lockIds) {
    const p = byId.get(id);
    if (p && p.available) poolMap.set(id, p);
  }
  const candidates = [...poolMap.values()];

  const empty: OptimizedSquad = {
    feasible: false,
    startingXI: [],
    bench: [],
    captain: null,
    viceCaptain: null,
    formation: "",
    totalCost: 0,
    budget,
    remaining: budget,
    projectedPoints: 0,
  };

  // --- Build the ILP model -------------------------------------------------
  const constraints: Record<
    string,
    { min?: number; max?: number; equal?: number }
  > = {
    squadSize: { equal: 15 },
    xiSize: { equal: 11 },
    budget: { max: budget },
    sq_GK: { equal: SQUAD_COMPOSITION.GK },
    sq_DEF: { equal: SQUAD_COMPOSITION.DEF },
    sq_MID: { equal: SQUAD_COMPOSITION.MID },
    sq_FWD: { equal: SQUAD_COMPOSITION.FWD },
    // Starting-XI position ranges. With GK=1 & total=11, these ranges collapse
    // to exactly the 7 legal formations (no illegal combos are reachable).
    xi_GK: { equal: 1 },
    xi_DEF: { min: 3, max: 5 },
    xi_MID: { min: 3, max: 5 },
    xi_FWD: { min: 1, max: 3 },
  };

  // Nation caps.
  const nations = new Set(candidates.map((p) => p.squadId));
  for (const sid of nations) constraints[`nat_${sid}`] = { max: maxPerNation };

  const variables: Record<string, Record<string, number>> = {};
  const binaries: Record<string, 1> = {};

  for (const p of candidates) {
    const sq = `s${p.id}`; // in 15-man squad
    const xi = `x${p.id}`; // in starting XI

    variables[sq] = {
      squadSize: 1,
      budget: p.price,
      [`sq_${p.position}`]: 1,
      [`nat_${p.squadId}`]: 1,
      [`link_${p.id}`]: 1, // s - x >= 0  →  link >= 0
    };
    variables[xi] = {
      xiSize: 1,
      [`xi_${p.position}`]: 1,
      [`link_${p.id}`]: -1,
      proj: p.projectedPoints, // objective: maximize XI projected points
    };
    constraints[`link_${p.id}`] = { min: 0 }; // s_i - x_i >= 0  ⇒  x_i ≤ s_i
    binaries[sq] = 1;
    binaries[xi] = 1;

    if (lockIds.has(p.id)) {
      constraints[`lock_${p.id}`] = { equal: 1 };
      variables[sq][`lock_${p.id}`] = 1;
    }
  }

  const solution = solver.Solve({
    optimize: "proj",
    opType: "max",
    constraints,
    variables,
    binaries,
    options: { tolerance: 0.0001 },
  });

  if (!solution.feasible) {
    return {
      ...empty,
      reason:
        "No valid squad fits these constraints — try raising the budget or unlocking players.",
    };
  }

  const squadIds: number[] = [];
  const startIds = new Set<number>();
  for (const p of candidates) {
    if (solution[`s${p.id}`] === 1) squadIds.push(p.id);
    if (solution[`x${p.id}`] === 1) startIds.add(p.id);
  }

  const squad = squadIds.map((id) => byId.get(id)!).filter(Boolean);
  const startingXI = squad.filter((p) => startIds.has(p.id));
  const bench = squad.filter((p) => !startIds.has(p.id));

  // Identify the realized formation.
  const xiCounts = countByPosition(startingXI);
  const formation =
    FORMATIONS.find((f) => {
      const c = formationCounts(f);
      return POSITIONS.every((pos) => (xiCounts[pos] ?? 0) === c[pos]);
    })?.key ?? `${xiCounts.DEF}-${xiCounts.MID}-${xiCounts.FWD}`;

  // Captain = highest projected starter; vice = next highest.
  const ranked = [...startingXI].sort(
    (a, b) => b.projectedPoints - a.projectedPoints,
  );
  const captain = ranked[0] ?? null;
  const viceCaptain = ranked[1] ?? null;

  const totalCost =
    Math.round(squad.reduce((s, p) => s + p.price, 0) * 10) / 10;
  const xiProjected = startingXI.reduce((s, p) => s + p.projectedPoints, 0);
  const projectedPoints =
    Math.round((xiProjected + (captain?.projectedPoints ?? 0)) * 100) / 100;

  // Order bench: backup GK first, then by ascending projected (auto-sub order).
  bench.sort((a, b) => {
    if (a.position === "GK" && b.position !== "GK") return -1;
    if (b.position === "GK" && a.position !== "GK") return 1;
    return a.projectedPoints - b.projectedPoints;
  });

  return {
    feasible: true,
    startingXI: sortXI(startingXI),
    bench,
    captain,
    viceCaptain,
    formation,
    totalCost,
    budget,
    remaining: Math.round((budget - totalCost) * 10) / 10,
    projectedPoints,
  };
}

function countByPosition(players: Player[]): Record<Position, number> {
  const c: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of players) c[p.position]++;
  return c;
}

const POS_ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
function sortXI(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (POS_ORDER[a.position] !== POS_ORDER[b.position])
      return POS_ORDER[a.position] - POS_ORDER[b.position];
    return b.projectedPoints - a.projectedPoints;
  });
}
