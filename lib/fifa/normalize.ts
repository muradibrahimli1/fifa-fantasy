import type { RawPlayer, RawRound, RawSquad, RawTournament } from "./raw";
import type {
  Dataset,
  Fixture,
  Nation,
  Player,
  Position,
  Round,
} from "./types";
import { projectPoints } from "./projection";

function displayName(p: RawPlayer): string {
  if (p.knownName) return p.knownName;
  const full = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return full || `Player ${p.id}`;
}

// roundPoints arrives as [] (empty) or { "1": 10 }. Normalize to Record<number,number>.
function normalizeRoundPoints(
  rp: Record<string, number> | unknown[],
): Record<number, number> {
  const out: Record<number, number> = {};
  if (Array.isArray(rp)) {
    rp.forEach((v, i) => {
      if (typeof v === "number") out[i + 1] = v;
    });
  } else if (rp && typeof rp === "object") {
    for (const [k, v] of Object.entries(rp)) {
      if (typeof v === "number") out[Number(k)] = v;
    }
  }
  return out;
}

// The player.squadId space (1..48) matches the fixture home/awaySquadId space,
// but NOT the ids in squads_fifa.json. So we build the canonical nation list
// from the fixtures feed, and enrich group/seed from squads_fifa by matching abbr.
function buildNations(
  fixtures: RawTournament[],
  squads: RawSquad[],
): Nation[] {
  const byAbbr = new Map<string, RawSquad>();
  for (const s of squads) byAbbr.set(s.abbr.toUpperCase(), s);

  const map = new Map<number, Nation>();
  const consider = (id: number, name: string, abbr: string) => {
    if (map.has(id)) return;
    const enrich = byAbbr.get(abbr?.toUpperCase());
    map.set(id, {
      id,
      name,
      abbr,
      group: enrich?.group ?? null,
      seed: enrich?.seed ?? null,
    });
  };
  for (const f of fixtures) {
    consider(f.homeSquadId, f.homeSquadName, f.homeSquadAbbr);
    consider(f.awaySquadId, f.awaySquadName, f.awaySquadAbbr);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function normalize(
  rawPlayers: RawPlayer[],
  rawRounds: RawRound[],
  rawSquads: RawSquad[],
): Dataset {
  const rawFixtures: RawTournament[] = rawRounds.flatMap((r) =>
    (r.tournaments ?? []).map((t) => ({ ...t, roundId: r.id })),
  ) as (RawTournament & { roundId: number })[];

  const nations = buildNations(rawFixtures, rawSquads);
  const nationById: Record<number, Nation> = {};
  for (const n of nations) nationById[n.id] = n;

  const fixtures: Fixture[] = rawRounds
    .flatMap((r) =>
      (r.tournaments ?? []).map(
        (t): Fixture => ({
          id: t.id,
          roundId: r.id,
          date: t.date,
          status: t.status,
          venueCity: t.venueCity,
          homeSquadId: t.homeSquadId,
          awaySquadId: t.awaySquadId,
          homeName: t.homeSquadName,
          awayName: t.awaySquadName,
          homeAbbr: t.homeSquadAbbr,
          awayAbbr: t.awaySquadAbbr,
          homeScore: t.homeScore,
          awayScore: t.awayScore,
        }),
      ),
    )
    .sort((a, b) => a.id - b.id);

  const fixtureById: Record<number, Fixture> = {};
  for (const f of fixtures) fixtureById[f.id] = f;

  const rounds: Round[] = rawRounds.map((r) => ({
    id: r.id,
    status: r.status,
    startDate: r.startDate,
    endDate: r.endDate,
    fixtureCount: (r.tournaments ?? []).length,
  }));

  // Active round = first one not yet complete (status "playing" or "scheduled"
  // with fixtures). Falls back to the earliest scheduled round.
  const activeRound =
    rawRounds.find((r) => r.status === "playing") ??
    rawRounds.find(
      (r) => r.status === "scheduled" && (r.tournaments ?? []).length > 0,
    );
  const activeRoundId = activeRound?.id ?? null;

  const players: Player[] = rawPlayers.map((p): Player => {
    const nation = nationById[p.squadId];
    const roundPoints = normalizeRoundPoints(p.stats.roundPoints);
    const playedRounds = Object.keys(roundPoints).length;
    const available = p.status === "playing";
    const nextFixtureId =
      p.stats.nextFixtureFromScheduledRound ??
      p.stats.nextFixtureFromActiveRound ??
      null;
    const nextFixture = nextFixtureId != null ? fixtureById[nextFixtureId] : null;

    let nextOpponentAbbr: string | null = null;
    let nextIsHome: boolean | null = null;
    if (nextFixture) {
      nextIsHome = nextFixture.homeSquadId === p.squadId;
      nextOpponentAbbr = nextIsHome ? nextFixture.awayAbbr : nextFixture.homeAbbr;
    }

    const projectedPoints = projectPoints({
      position: p.position as Position,
      price: p.price,
      form: p.stats.form ?? 0,
      avgPoints: p.stats.avgPoints ?? 0,
      playedRounds,
      available,
      nextFixture: nextFixture ?? null,
      squadId: p.squadId,
      nationById,
    });

    return {
      id: p.id,
      name: displayName(p),
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      position: p.position as Position,
      price: p.price,
      squadId: p.squadId,
      nation: nation?.name ?? `#${p.squadId}`,
      nationAbbr: nation?.abbr ?? "?",
      group: nation?.group ?? null,
      status: p.status,
      available,
      ownership: p.percentSelected ?? 0,
      totalPoints: p.stats.totalPoints ?? 0,
      avgPoints: p.stats.avgPoints ?? 0,
      form: p.stats.form ?? 0,
      lastRoundPoints: p.stats.lastRoundPoints ?? 0,
      roundPoints,
      playedRounds,
      nextFixtureId,
      nextOpponentAbbr,
      nextIsHome,
      oneToWatch: p.oneToWatch ?? false,
      projectedPoints,
      valueScore:
        p.price > 0 ? Math.round((projectedPoints / p.price) * 1000) / 1000 : 0,
    };
  });

  return {
    players,
    nations,
    fixtures,
    rounds,
    nationById,
    fixtureById,
    activeRoundId,
    fetchedAt: new Date().toISOString(),
  };
}
