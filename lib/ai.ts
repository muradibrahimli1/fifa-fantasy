import type { Dataset, Player, Position } from "./fifa/types";
import { bestTransfers } from "./advisor";
import { pickBestXI, validateSquad } from "./lineup";
import { CHIPS, stageForRound } from "./rules";

// ---------------------------------------------------------------------------
// AI decision layer (OpenAI). The deterministic engine computes all the hard
// facts (stats, projections, budget, legal transfer candidates) and hands them
// to GPT, which makes the judgment calls. The model never invents numbers — it
// reasons over the data we give it and returns a structured decision.
// ---------------------------------------------------------------------------

export interface AIDecision {
  verdict: string;
  captain: { player: string; reason: string };
  viceCaptain: { player: string; reason: string };
  transfers: { out: string; in: string; reason: string }[];
  chip: { recommend: boolean; chip: string; reason: string };
  formation: string;
  keyRisks: string[];
}

export interface AIResult {
  ok: boolean;
  decision?: AIDecision;
  error?: string;
  model?: string;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function slim(p: Player) {
  return {
    name: p.name,
    pos: p.position,
    nation: p.nationAbbr,
    price: p.price,
    totalPoints: p.totalPoints,
    form: p.form,
    projectedNext: p.projectedPoints,
    available: p.available,
    next: p.nextOpponentAbbr
      ? `${p.nextIsHome ? "vs" : "@"}${p.nextOpponentAbbr}`
      : null,
  };
}

// Assemble the full factual context the model reasons over.
export function buildContext(dataset: Dataset, squadIds: number[]) {
  const byId = new Map(dataset.players.map((p) => [p.id, p]));
  const squad = squadIds
    .map((id) => byId.get(id))
    .filter((p): p is Player => Boolean(p));

  const roundId = dataset.activeRoundId;
  const stage = stageForRound(roundId);
  const validation = validateSquad(squad, stage.key);
  const lineup = pickBestXI(squad);
  const bank = Math.max(0, validation.remaining);

  // Precomputed legal transfer upgrades (the model picks among/justifies these).
  const transferCandidates = bestTransfers(
    squad,
    dataset.players,
    bank,
    stage.maxPerNation,
    8,
  ).map((t) => ({
    out: t.out.name,
    in: t.in.name,
    position: t.out.position,
    projectedGain: t.gain,
    costDelta: t.costDelta,
  }));

  // Best available alternatives per position (not owned) for broader context.
  const owned = new Set(squad.map((p) => p.id));
  const topByPos: Record<string, ReturnType<typeof slim>[]> = {};
  for (const pos of ["GK", "DEF", "MID", "FWD"] as Position[]) {
    topByPos[pos] = dataset.players
      .filter((p) => p.position === pos && p.available && !owned.has(p.id))
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .slice(0, 6)
      .map(slim);
  }

  return {
    stage: stage.label,
    rules: {
      budget: stage.budget,
      maxPerNation: stage.maxPerNation,
      squad: "2 GK, 5 DEF, 5 MID, 3 FWD; captain scores 2x",
      chips: CHIPS.map((c) => `${c.name}: ${c.description}`),
    },
    deadlineRoundId: roundId,
    bank,
    squadLegal: validation.ok,
    squadIssues: validation.errors,
    suggestedFormation: lineup.formation,
    squad: squad.map(slim),
    transferCandidates,
    topAvailableByPosition: topByPos,
  };
}

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      description: "2-4 sentence overall summary of what to do this round.",
    },
    captain: {
      type: "object",
      additionalProperties: false,
      properties: {
        player: { type: "string" },
        reason: { type: "string" },
      },
      required: ["player", "reason"],
    },
    viceCaptain: {
      type: "object",
      additionalProperties: false,
      properties: {
        player: { type: "string" },
        reason: { type: "string" },
      },
      required: ["player", "reason"],
    },
    transfers: {
      type: "array",
      description: "Recommended transfers this round (empty if none worthwhile).",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          out: { type: "string" },
          in: { type: "string" },
          reason: { type: "string" },
        },
        required: ["out", "in", "reason"],
      },
    },
    chip: {
      type: "object",
      additionalProperties: false,
      properties: {
        recommend: { type: "boolean" },
        chip: { type: "string" },
        reason: { type: "string" },
      },
      required: ["recommend", "chip", "reason"],
    },
    formation: { type: "string" },
    keyRisks: { type: "array", items: { type: "string" } },
  },
  required: [
    "verdict",
    "captain",
    "viceCaptain",
    "transfers",
    "chip",
    "formation",
    "keyRisks",
  ],
} as const;

const SYSTEM_PROMPT = `You are an elite FIFA World Cup 2026 Fantasy strategist.
You will be given the official rules, the user's current 15-man squad with live
stats and a projected-points model, their available bank, legal transfer
candidates (pre-validated for budget and the per-nation cap), and the best
available alternatives per position.

Make the decisions for this round: captain (scores double), vice-captain,
transfers (only if they meaningfully help — it's fine to recommend none),
whether to play a chip, and the formation. Reason over the numbers provided;
never invent stats. Only recommend transfers/players that appear in the data,
and respect the budget, squad shape (2-5-5-3) and per-nation cap. Prefer
players with good projected points AND favourable fixtures. Be decisive and
concise. Return ONLY the structured JSON.`;

export async function getAIDecision(
  dataset: Dataset,
  squadIds: number[],
): Promise<AIResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "OPENAI_API_KEY not set. Add it in your env to enable AI decisions.",
    };
  }
  if (squadIds.length === 0) {
    return { ok: false, error: "No squad provided — add your 15 players first." };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const context = buildContext(dataset, squadIds);

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Here is everything for this round:\n\n${JSON.stringify(
              context,
              null,
              2,
            )}\n\nDecide what I should do.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "fantasy_decision",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });
  } catch (err) {
    return {
      ok: false,
      error: `OpenAI request failed: ${err instanceof Error ? err.message : "network error"}`,
    };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `OpenAI API ${res.status}: ${body.slice(0, 300)}` };
  }

  try {
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "Empty response from OpenAI." };
    const decision = JSON.parse(content) as AIDecision;
    return { ok: true, decision, model };
  } catch (err) {
    return {
      ok: false,
      error: `Could not parse AI response: ${err instanceof Error ? err.message : "bad JSON"}`,
    };
  }
}
