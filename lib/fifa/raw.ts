// Raw shapes returned by the official (undocumented) FIFA World Cup Fantasy JSON API.
// Base: https://play.fifa.com/json/fantasy/
// These mirror the API verbatim; normalized app models live in ./types.ts.

export interface RawPlayer {
  id: number;
  firstName: string;
  lastName: string;
  knownName: string | null;
  squadId: number;
  position: "GK" | "DEF" | "MID" | "FWD";
  price: number;
  status: string; // "playing" | "transferred"
  matchStatus: string | null;
  percentSelected: number;
  roundsSelected: Record<string, number>;
  stats: {
    totalPoints: number;
    avgPoints: number;
    form: number;
    lastRoundPoints: number;
    // The API returns [] when empty, or { "1": 10, ... } when populated.
    roundPoints: Record<string, number> | unknown[];
    nextFixtureFromActiveRound: number | null;
    nextFixtureFromScheduledRound: number | null;
  };
  oneToWatch: boolean;
  oneToWatchText: string | null;
  qualificationRoundIds: number[];
  fifaId: number | null;
}

export interface RawTournament {
  id: number; // global fixture id (1..72 group stage)
  period: string;
  minutes: number;
  date: string;
  status: string; // "scheduled" | "complete" | ...
  isSuspended: boolean;
  venueName: string | null;
  venueCity: string | null;
  homeSquadId: number;
  awaySquadId: number;
  homeSquadName: string;
  awaySquadName: string;
  homeSquadAbbr: string;
  awaySquadAbbr: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
}

export interface RawRound {
  id: number;
  status: string; // "playing" | "scheduled" | ...
  startDate: string;
  endDate: string;
  tournaments: RawTournament[];
}

export interface RawSquad {
  id: number;
  name: string;
  abbr: string;
  seed: number | null;
  isActive: boolean;
  group: string | null;
  groupPosition: number | null;
}
