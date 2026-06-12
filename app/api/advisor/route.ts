import { NextResponse } from "next/server";
import { getDataset } from "@/lib/fifa/client";
import { analyze } from "@/lib/advisor";
import { formatReport, sendTelegram } from "@/lib/telegram";

// Generates an advisor report for a given squad. Used by the in-app Advisor
// page. Pass { send: true } to also push the report to Telegram.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      ids?: number[];
      roundId?: number | null;
      send?: boolean;
    };
    const data = await getDataset();
    const report = analyze(data, body.ids ?? [], { roundId: body.roundId });

    let telegram: { ok: boolean; error?: string } | undefined;
    if (body.send) telegram = await sendTelegram(formatReport(report));

    return NextResponse.json({ report, telegram });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Advisor failed" },
      { status: 500 },
    );
  }
}
