import { NextResponse } from "next/server";
import { getDataset } from "@/lib/fifa/client";
import { getAIDecision } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Hands the full factual context to OpenAI and returns its structured decision.
export async function POST(req: Request) {
  try {
    const { ids } = (await req.json()) as { ids?: number[] };
    const data = await getDataset();
    const result = await getAIDecision(data, ids ?? []);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "AI advice failed" },
      { status: 500 },
    );
  }
}
