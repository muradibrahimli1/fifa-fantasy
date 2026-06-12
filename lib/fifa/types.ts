// Normalized, app-facing models. Built from raw API shapes in ./normalize.ts.

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface Nation {
  id: number; // squadId used across players & fixtures
  name: string;
  abbr: string;
  group: string | null;
  seed: number | null;
}

export interface Fixture {
  id: number;
  roundId: number;
  date: string;
  status: string; // scheduled | complete | ...
  venueCity: string | null;
  homeSquadId: number;
  awaySquadId: number;
  homeName: string;
  awayName: string;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface Round {
  id: number;
  status: string;
  startDate: string;
  endDate: string;
  fixtureCount: number;
}

export interface Player {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  position: Position;
  price: number;
  squadId: number;
  nation: string;
  nationAbbr: string;
  group: string | null;
  status: string;
  available: boolean;
  ownership: number;
  totalPoints: number;
  avgPoints: number;
  form: number;
  lastRoundPoints: number;
  roundPoints: Record<number, number>;
  playedRounds: number;
  nextFixtureId: number | null;
  nextOpponentAbbr: string | null;
  nextIsHome: boolean | null;
  oneToWatch: boolean;
  // Derived projection (see projection.ts)
  projectedPoints: number; // expected points for the next round
  valueScore: number; // projectedPoints per $1m — selection efficiency
}

export interface Dataset {
  players: Player[];
  nations: Nation[];
  fixtures: Fixture[];
  rounds: Round[];
  nationById: Record<number, Nation>;
  fixtureById: Record<number, Fixture>;
  activeRoundId: number | null;
  fetchedAt: string;
}
