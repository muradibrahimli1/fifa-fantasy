import { NextResponse } from "next/server";
import { getDataset } from "@/lib/fifa/client";
import { analyze } from "@/lib/advisor";
import { formatReport, sendTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Always-on analysis endpoint, triggered by Vercel Cron (see vercel.json).
// Reads your squad from MY_SQUAD_IDS, analyzes the live feed, and pushes the
// commands to Telegram. Secured with CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const url = new URL(req.url);
    const qsSecret = url.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qsSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const ids = (process.env.MY_SQUAD_IDS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  try {
    const data = await getDataset();
    const report = analyze(data, ids);
    const text = formatReport(report);
    const telegram = await sendTelegram(text);

    return NextResponse.json({
      ok: true,
      sent: telegram.ok,
      telegramError: telegram.error,
      round: report.roundId,
      squadCount: report.squadCount,
      recommendations: report.recommendations.length,
      generatedAt: report.generatedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 },
    );
  }
}
