import { NextResponse } from "next/server";
import { getDataset } from "@/lib/fifa/client";
import { optimizeSquad, type OptimizeOptions } from "@/lib/optimizer";

export async function POST(req: Request) {
  try {
    const opts = (await req.json()) as OptimizeOptions;
    const data = await getDataset();
    const result = optimizeSquad(data.players, {
      stageKey: opts.stageKey,
      budget: opts.budget,
      lockIds: opts.lockIds,
      excludeIds: opts.excludeIds,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Optimization failed" },
      { status: 500 },
    );
  }
}
