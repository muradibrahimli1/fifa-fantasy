import { NextResponse } from "next/server";
import { getDataset } from "@/lib/fifa/client";

// Serves the normalized dataset to client components (tracker, optimizer picker).
export async function GET() {
  try {
    const data = await getDataset();
    return NextResponse.json({
      players: data.players,
      nations: data.nations,
      fixtures: data.fixtures,
      rounds: data.rounds,
      activeRoundId: data.activeRoundId,
      fetchedAt: data.fetchedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load FIFA data" },
      { status: 502 },
    );
  }
}
