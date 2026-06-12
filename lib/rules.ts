import type { Position } from "./fifa/types";

// ---------------------------------------------------------------------------
// Official FIFA World Cup Fantasy 2026 rules, encoded in one place so the
// optimizer and the squad validator stay consistent with the real game.
// Source: play.fifa.com/fantasy/help and published 2026 rule guides.
// ---------------------------------------------------------------------------

export const SQUAD_SIZE = 15;

export const SQUAD_COMPOSITION: Record<Position, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

export const STARTING_XI = 11;

export const BUDGET = {
  initial: 100.0, // $m, group stage
  knockout: 105.0, // +$5m applied from the Round of 32
};

// Valid starting formations (GK is always 1). Keyed by "DEF-MID-FWD".
export interface Formation {
  key: string;
  def: number;
  mid: number;
  fwd: number;
}

export const FORMATIONS: Formation[] = [
  { key: "3-4-3", def: 3, mid: 4, fwd: 3 },
  { key: "3-5-2", def: 3, mid: 5, fwd: 2 },
  { key: "4-3-3", def: 4, mid: 3, fwd: 3 },
  { key: "4-4-2", def: 4, mid: 4, fwd: 2 },
  { key: "4-5-1", def: 4, mid: 5, fwd: 1 },
  { key: "5-3-2", def: 5, mid: 3, fwd: 2 },
  { key: "5-4-1", def: 5, mid: 4, fwd: 1 },
];

// Max players you may select from a single nation, by tournament stage.
export interface StageRule {
  key: string;
  label: string;
  maxPerNation: number;
  budget: number;
}

export const STAGES: StageRule[] = [
  { key: "group", label: "Group stage", maxPerNation: 3, budget: BUDGET.initial },
  { key: "r32", label: "Round of 32", maxPerNation: 3, budget: BUDGET.knockout },
  { key: "r16", label: "Round of 16", maxPerNation: 4, budget: BUDGET.knockout },
  { key: "qf", label: "Quarter-finals", maxPerNation: 5, budget: BUDGET.knockout },
  { key: "sf", label: "Semi-finals", maxPerNation: 6, budget: BUDGET.knockout },
  { key: "final", label: "Final", maxPerNation: 8, budget: BUDGET.knockout },
];

export const DEFAULT_STAGE = STAGES[0];

// Map a round id (1..8 in the FIFA feed) to its stage rules.
export function stageForRound(roundId: number | null | undefined): StageRule {
  switch (roundId) {
    case 4:
      return STAGES[1]; // Round of 32
    case 5:
      return STAGES[2]; // Round of 16
    case 6:
      return STAGES[3]; // Quarter-finals
    case 7:
      return STAGES[4]; // Semi-finals
    case 8:
      return STAGES[5]; // Final
    default:
      return STAGES[0]; // Group stage (rounds 1-3)
  }
}

// Scoring system (points). Used for documentation and the player-detail view.
export const SCORING = {
  appearance: 1, // 1+ minute played
  goal: { GK: 5, DEF: 5, MID: 5, FWD: 5 } as Record<Position, number>,
  assist: 3,
  penaltyWon: 5,
  penaltyMissed: -2,
  cleanSheet: { GK: 5, DEF: 5, MID: 1, FWD: 0 } as Record<Position, number>, // 60+ min
  goalConcededPer2: -1, // GK/DEF: -1 for every 2 conceded
  tacklesPer3: 1, // MID: +1 every 3 tackles
  chancesCreatedPer2: 1, // MID: +1 every 2 chances created
  shotsOnTargetPer2: 1, // FWD: +1 every 2 shots on target
  yellowCard: -1,
  redCard: -3,
  ownGoal: -2,
  bonusHighPerformer: 3,
  bonusStarPerformer: 5,
};

export interface Chip {
  key: string;
  name: string;
  description: string;
}

export const CHIPS: Chip[] = [
  { key: "wildcard", name: "Wildcard", description: "Unlimited free transfers for one round." },
  { key: "twelfth_man", name: "12th Man", description: "Add one extra player ignoring budget & squad limits." },
  { key: "max_captain", name: "Maximum Captain", description: "Your highest XI scorer is auto-captained (double points)." },
  { key: "qualification", name: "Qualification Booster", description: "+2 to each starting XI player whose team progresses." },
  { key: "mystery", name: "Mystery Booster", description: "Revealed before the Round of 32." },
];

// Free transfers allowed before each round (group stage onward).
export const TRANSFERS: { stage: string; free: number | "unlimited" }[] = [
  { stage: "Pre-tournament", free: "unlimited" },
  { stage: "Before Matchday 2", free: 2 },
  { stage: "Before Matchday 3", free: 2 },
  { stage: "Before Round of 32", free: "unlimited" },
  { stage: "Before Round of 16", free: 4 },
  { stage: "Before Quarter-finals", free: 4 },
  { stage: "Before Semi-finals", free: 5 },
  { stage: "Before Final", free: 6 },
];

export const TRANSFER_HIT = -3; // points per extra transfer beyond the free allowance

export function formationCounts(f: Formation): Record<Position, number> {
  return { GK: 1, DEF: f.def, MID: f.mid, FWD: f.fwd };
}
