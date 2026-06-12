import type { Dataset, Player } from "./fifa/types";
import { pickBestXI, validateSquad } from "./lineup";
import { stageForRound } from "./rules";

// ---------------------------------------------------------------------------
// The advisor turns the live feed + your squad into ranked, actionable
// "commands": transfers, captain, lineup, chip timing, alerts & deadlines.
// Pure & deterministic so it runs identically in the cron and in the UI.
// ---------------------------------------------------------------------------

export type RecKind = "alert" | "deadline" | "transfer" | "captain" | "lineup" | "chip";

export interface Recommendation {
  kind: RecKind;
  priority: number; // higher = more urgent (used for ordering & emoji)
  title: string; // short command, e.g. "SELL Saka → BUY Musiala (+4.1)"
  detail: string; // one-line rationale
}

export interface TransferIdea {
  out: Player;
  in: Player;
  gain: number; // projected points gained next round
  costDelta: number; // price change (in - out)
}

export interface AdvisorReport {
  generatedAt: string;
  roundId: number | null;
  stageLabel: string;
  deadline: string | null;
  deadlineInHours: number | null;
  squadCount: number;
  squadValid: boolean;
  bank: number;
  projectedXI: number;
  formation: string;
  captainName: string | null;
  recommendations: Recommendation[];
  transferIdeas: TransferIdea[];
}

function hoursUntil(iso: string): number {
  return Math.round(((new Date(iso).getTime() - Date.now()) / 3_600_000) * 10) / 10;
}

function fmt(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1);
}

// Best single transfer per owned player: free up their price + bank, then find
// the highest-projected legal replacement at the same position.
export function bestTransfers(
  squad: Player[],
  pool: Player[],
  bank: number,
  maxPerNation: number,
  limit = 3,
): TransferIdea[] {
  const ownedIds = new Set(squad.map((p) => p.id));
  const nationCounts = new Map<number, number>();
  for (const p of squad)
    nationCounts.set(p.squadId, (nationCounts.get(p.squadId) ?? 0) + 1);

  const ideas: TransferIdea[] = [];

  for (const out of squad) {
    const budgetForIn = bank + out.price;
    let best: Player | null = null;

    for (const cand of pool) {
      if (ownedIds.has(cand.id)) continue;
      if (!cand.available) continue;
      if (cand.position !== out.position) continue;
      if (cand.price > budgetForIn + 1e-9) continue;
      // Nation cap after swapping out → in.
      const sameNation = cand.squadId === out.squadId;
      const projectedCount =
        (nationCounts.get(cand.squadId) ?? 0) + (sameNation ? 0 : 1);
      if (!sameNation && projectedCount > maxPerNation) continue;
      if (!best || cand.projectedPoints > best.projectedPoints) best = cand;
    }

    if (best && best.projectedPoints > out.projectedPoints + 0.05) {
      ideas.push({
        out,
        in: best,
        gain: Math.round((best.projectedPoints - out.projectedPoints) * 100) / 100,
        costDelta: Math.round((best.price - out.price) * 10) / 10,
      });
    }
  }

  return ideas.sort((a, b) => b.gain - a.gain).slice(0, limit);
}

export function analyze(
  dataset: Dataset,
  squadIds: number[],
  opts: { roundId?: number | null } = {},
): AdvisorReport {
  const byId = new Map(dataset.players.map((p) => [p.id, p]));
  const squad = squadIds
    .map((id) => byId.get(id))
    .filter((p): p is Player => Boolean(p));

  const roundId = opts.roundId ?? dataset.activeRoundId;
  const stage = stageForRound(roundId);
  const validation = validateSquad(squad, stage.key);
  const lineup = pickBestXI(squad);

  const round = dataset.rounds.find((r) => r.id === roundId);
  const deadline = round?.startDate ?? null;
  const deadlineInHours = deadline ? hoursUntil(deadline) : null;

  const bank = Math.max(0, validation.remaining);
  const projectedXI =
    lineup.startingXI.reduce((s, p) => s + p.projectedPoints, 0) +
    (lineup.captain?.projectedPoints ?? 0);

  const recs: Recommendation[] = [];

  // --- Deadline -----------------------------------------------------------
  if (deadline && deadlineInHours != null && deadlineInHours > 0) {
    const urgent = deadlineInHours <= 24;
    recs.push({
      kind: "deadline",
      priority: urgent ? 95 : 50,
      title: `Deadline: Round ${roundId} in ${formatHours(deadlineInHours)}`,
      detail: urgent
        ? "Lock in transfers, captain and lineup before kickoff."
        : "Plan ahead — changes are still open.",
    });
  }

  // --- Alerts: unavailable players in your squad --------------------------
  const out = squad.filter((p) => !p.available);
  for (const p of out) {
    recs.push({
      kind: "alert",
      priority: 100,
      title: `OUT: ${p.name} (${p.nationAbbr}) is unavailable`,
      detail: "Transfer them out — they won't score.",
    });
  }
  if (!validation.ok) {
    for (const e of validation.errors) {
      recs.push({
        kind: "alert",
        priority: 90,
        title: `Fix squad: ${e}`,
        detail: "Your squad is currently illegal for this stage.",
      });
    }
  }

  // --- Transfers ----------------------------------------------------------
  const transferIdeas =
    squad.length > 0
      ? bestTransfers(squad, dataset.players, bank, stage.maxPerNation)
      : [];
  transferIdeas.forEach((t, i) => {
    recs.push({
      kind: "transfer",
      priority: 80 - i,
      title: `SELL ${t.out.name} → BUY ${t.in.name} (${fmt(t.gain)} pts)`,
      detail: `${t.out.position} swap · ${t.out.nationAbbr}→${t.in.nationAbbr} · cost ${fmt(
        t.costDelta,
      )}m · bank after ${(bank - t.costDelta).toFixed(1)}m`,
    });
  });

  // --- Captain ------------------------------------------------------------
  if (lineup.captain) {
    const c = lineup.captain;
    recs.push({
      kind: "captain",
      priority: 70,
      title: `CAPTAIN: ${c.name} (${c.nationAbbr})`,
      detail: `Projected ${(c.projectedPoints * 2).toFixed(1)} pts doubled. Vice: ${
        lineup.viceCaptain?.name ?? "—"
      }.`,
    });
  }

  // --- Lineup / bench -----------------------------------------------------
  if (lineup.startingXI.length === 11) {
    const benchStr = lineup.bench.map((p) => p.lastName || p.name).join(", ");
    recs.push({
      kind: "lineup",
      priority: 60,
      title: `LINEUP: play ${lineup.formation}`,
      detail: `Bench: ${benchStr || "—"}.`,
    });
  }

  // --- Chip timing (heuristic) -------------------------------------------
  for (const chip of chipAdvice(squad, transferIdeas, lineup.captain, out.length, roundId)) {
    recs.push(chip);
  }

  recs.sort((a, b) => b.priority - a.priority);

  return {
    generatedAt: new Date().toISOString(),
    roundId: roundId ?? null,
    stageLabel: stage.label,
    deadline,
    deadlineInHours,
    squadCount: squad.length,
    squadValid: validation.ok,
    bank: validation.remaining,
    projectedXI: Math.round(projectedXI * 10) / 10,
    formation: lineup.formation,
    captainName: lineup.captain?.name ?? null,
    recommendations: recs,
    transferIdeas,
  };
}

function chipAdvice(
  squad: Player[],
  ideas: TransferIdea[],
  captain: Player | null,
  unavailableCount: number,
  roundId: number | null,
): Recommendation[] {
  const out: Recommendation[] = [];

  // Wildcard: many problems at once → a single round of unlimited transfers helps.
  const bigGainIdeas = ideas.filter((i) => i.gain >= 2).length;
  if (squad.length === 15 && (unavailableCount >= 3 || bigGainIdeas >= 4)) {
    out.push({
      kind: "chip",
      priority: 65,
      title: "CHIP: consider your Wildcard",
      detail: `You have ${
        unavailableCount ? `${unavailableCount} unavailable and ` : ""
      }${bigGainIdeas} strong upgrades available — a Wildcard rebuilds for free.`,
    });
  }

  // Maximum Captain: your top scorer projects far above the rest → double down.
  if (captain && squad.length >= 11) {
    const others = squad
      .filter((p) => p.id !== captain.id && p.available)
      .map((p) => p.projectedPoints)
      .sort((a, b) => b - a);
    const secondBest = others[0] ?? 0;
    if (captain.projectedPoints >= 5 && captain.projectedPoints - secondBest >= 2.5) {
      out.push({
        kind: "chip",
        priority: 55,
        title: "CHIP: good round for Maximum Captain",
        detail: `${captain.name} projects well clear of the field (${captain.projectedPoints.toFixed(
          1,
        )} vs ${secondBest.toFixed(1)}).`,
      });
    }
  }

  // Stage-based reminders.
  if (roundId === 4) {
    out.push({
      kind: "chip",
      priority: 40,
      title: "CHIP: Mystery Booster unlocks now",
      detail: "The Round-of-32 mystery booster is revealed — check the game.",
    });
  }

  return out;
}

function formatHours(h: number): string {
  if (h >= 48) return `${Math.round(h / 24)}d`;
  if (h >= 24) return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
  return `${h.toFixed(0)}h`;
}
