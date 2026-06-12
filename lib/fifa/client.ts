import { cache } from "react";
import type { RawPlayer, RawRound, RawSquad } from "./raw";
import type { Dataset } from "./types";
import { normalize } from "./normalize";

const BASE = "https://play.fifa.com/json/fantasy";

// Revalidate the upstream JSON every 15 minutes. During live matches you may
// want this lower; override with FIFA_REVALIDATE_SECONDS.
const REVALIDATE = Number(process.env.FIFA_REVALIDATE_SECONDS ?? 900);

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    next: { revalidate: REVALIDATE },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`FIFA API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// `cache()` dedupes within a single request/render pass; Next's fetch cache
// handles cross-request caching via the revalidate window above.
export const getDataset = cache(async (): Promise<Dataset> => {
  const [players, rounds, squads] = await Promise.all([
    fetchJson<RawPlayer[]>("players.json"),
    fetchJson<RawRound[]>("rounds.json"),
    fetchJson<RawSquad[]>("squads_fifa.json"),
  ]);
  return normalize(players, rounds, squads);
});
