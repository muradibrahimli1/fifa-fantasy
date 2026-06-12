import type { Fixture, Nation, Position } from "./types";

// ---------------------------------------------------------------------------
// Projection model — estimates a player's expected points for the NEXT round.
//
// Design goals: transparent, tunable, and robust early in the tournament when
// most players have 0–1 games of data. We blend two signals:
//
//   1. Observed output (form / average points) — trustworthy once games exist.
//   2. A price baseline — FIFA's own prices encode expected output, so they are
//      a sensible prior before real data accumulates.
//
// A shrinkage weight shifts from prior → observed as a player plays more games.
// A light fixture-difficulty multiplier nudges the estimate up/down based on
// how strong the next opponent is (seed-based, neutral when unknown).
// ---------------------------------------------------------------------------

export interface ProjectionInputs {
  position: Position;
  price: number;
  form: number;
  avgPoints: number;
  playedRounds: number;
  available: boolean;
  nextFixture: Fixture | null;
  squadId: number;
  nationById: Record<number, Nation>;
}

// Expected points-per-match implied purely by price. Calibrated so a 4.0m
// budget player ≈ ~2 pts and a 12.0m premium ≈ ~6.5 pts per match.
function priceBaseline(price: number, position: Position): number {
  const base = Math.max(0, (price - 3.8) * 0.62 + 1.6);
  // Forwards/mids carry more attacking upside per price point than defenders.
  const positionTilt: Record<Position, number> = {
    FWD: 1.08,
    MID: 1.04,
    DEF: 0.95,
    GK: 0.9,
  };
  return base * positionTilt[position];
}

// Fixture difficulty from opponent seed (1 = strongest). Returns a multiplier
// in roughly [0.85, 1.15]; neutral (1.0) when seed data is missing.
export function fixtureMultiplier(
  opponentSeed: number | null | undefined,
): number {
  if (opponentSeed == null) return 1.0;
  // Seeds span ~1..4 across pots. Map a strong opponent (seed 1) → harder.
  const clamped = Math.max(1, Math.min(4, opponentSeed));
  return 0.9 + (clamped - 1) * (0.2 / 3); // seed1→0.90, seed4→1.10
}

export function projectPoints(inp: ProjectionInputs): number {
  if (!inp.available) return 0;

  const prior = priceBaseline(inp.price, inp.position);
  const observed = Math.max(inp.form, inp.avgPoints);

  // Shrinkage: more games played → trust observed more. +2 pseudo-games of prior.
  const w = inp.playedRounds / (inp.playedRounds + 2);
  let projected = w * observed + (1 - w) * prior;

  // Light fixture adjustment based on the next opponent's seed.
  let opponentSeed: number | null = null;
  if (inp.nextFixture) {
    const oppId =
      inp.nextFixture.homeSquadId === inp.squadId
        ? inp.nextFixture.awaySquadId
        : inp.nextFixture.homeSquadId;
    opponentSeed = inp.nationById[oppId]?.seed ?? null;
  }
  projected *= fixtureMultiplier(opponentSeed);

  return Math.round(projected * 100) / 100;
}
