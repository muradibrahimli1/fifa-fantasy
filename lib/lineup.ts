import type { Player, Position } from "./fifa/types";
import {
  DEFAULT_STAGE,
  FORMATIONS,
  SQUAD_COMPOSITION,
  STAGES,
  SQUAD_SIZE,
  formationCounts,
} from "./rules";

// Pick the best legal starting XI from a squad by projected points (client-safe;
// no solver dependency). Used by the team tracker to suggest a lineup.
export function pickBestXI(squad: Player[]): {
  startingXI: Player[];
  bench: Player[];
  formation: string;
  captain: Player | null;
  viceCaptain: Player | null;
} {
  const byPos: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of squad) byPos[p.position].push(p);
  for (const pos of Object.keys(byPos) as Position[]) {
    byPos[pos].sort((a, b) => b.projectedPoints - a.projectedPoints);
  }

  let best: { xi: Player[]; total: number; key: string } | null = null;
  for (const f of FORMATIONS) {
    const counts = formationCounts(f);
    if (
      byPos.GK.length < 1 ||
      byPos.DEF.length < counts.DEF ||
      byPos.MID.length < counts.MID ||
      byPos.FWD.length < counts.FWD
    )
      continue;
    const xi = [
      ...byPos.GK.slice(0, 1),
      ...byPos.DEF.slice(0, counts.DEF),
      ...byPos.MID.slice(0, counts.MID),
      ...byPos.FWD.slice(0, counts.FWD),
    ];
    const total = xi.reduce((s, p) => s + p.projectedPoints, 0);
    if (!best || total > best.total) best = { xi, total, key: f.key };
  }

  if (!best) {
    return {
      startingXI: [],
      bench: squad,
      formation: "—",
      captain: null,
      viceCaptain: null,
    };
  }

  const xiIds = new Set(best.xi.map((p) => p.id));
  const bench = squad.filter((p) => !xiIds.has(p.id));
  const ranked = [...best.xi].sort(
    (a, b) => b.projectedPoints - a.projectedPoints,
  );
  return {
    startingXI: best.xi,
    bench,
    formation: best.key,
    captain: ranked[0] ?? null,
    viceCaptain: ranked[1] ?? null,
  };
}

export interface SquadValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  cost: number;
  remaining: number;
  composition: Record<Position, number>;
}

export function validateSquad(
  squad: Player[],
  stageKey: string = DEFAULT_STAGE.key,
): SquadValidation {
  const stage = STAGES.find((s) => s.key === stageKey) ?? DEFAULT_STAGE;
  const errors: string[] = [];
  const warnings: string[] = [];

  const composition: Record<Position, number> = {
    GK: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };
  for (const p of squad) composition[p.position]++;

  const cost = Math.round(squad.reduce((s, p) => s + p.price, 0) * 10) / 10;
  const remaining = Math.round((stage.budget - cost) * 10) / 10;

  if (squad.length !== SQUAD_SIZE)
    errors.push(`Squad has ${squad.length}/${SQUAD_SIZE} players.`);

  for (const pos of Object.keys(SQUAD_COMPOSITION) as Position[]) {
    if (squad.length === SQUAD_SIZE && composition[pos] !== SQUAD_COMPOSITION[pos])
      errors.push(
        `Need ${SQUAD_COMPOSITION[pos]} ${pos}, have ${composition[pos]}.`,
      );
  }

  if (cost > stage.budget)
    errors.push(`Over budget by $${(cost - stage.budget).toFixed(1)}m.`);

  // Nation cap.
  const perNation = new Map<string, number>();
  for (const p of squad)
    perNation.set(p.nation, (perNation.get(p.nation) ?? 0) + 1);
  for (const [nation, n] of perNation) {
    if (n > stage.maxPerNation)
      errors.push(`${n} from ${nation} (max ${stage.maxPerNation} this stage).`);
  }

  // Availability warning.
  const out = squad.filter((p) => !p.available);
  if (out.length)
    warnings.push(
      `${out.length} selected player(s) are unavailable: ${out
        .map((p) => p.name)
        .join(", ")}.`,
    );

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    cost,
    remaining,
    composition,
  };
}
