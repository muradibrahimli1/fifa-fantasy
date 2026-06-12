import type { AdvisorReport, RecKind } from "./advisor";
import type { AIDecision } from "./ai";

const EMOJI: Record<RecKind, string> = {
  alert: "🚨",
  deadline: "⏰",
  transfer: "🔁",
  captain: "©️",
  lineup: "📋",
  chip: "🎫",
};

// Telegram MarkdownV2 requires escaping these characters in normal text.
function esc(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

export function formatReport(report: AdvisorReport): string {
  const lines: string[] = [];
  lines.push(`*⚽ WC2026 Fantasy — ${esc(report.stageLabel)}*`);

  const sub: string[] = [];
  if (report.deadlineInHours != null && report.deadlineInHours > 0)
    sub.push(`Deadline in ${esc(formatH(report.deadlineInHours))}`);
  sub.push(`Proj XI ${esc(report.projectedXI.toFixed(1))}`);
  sub.push(`Bank ${esc("$" + report.bank.toFixed(1) + "m")}`);
  lines.push(`_${sub.join(" · ")}_`);
  lines.push("");

  if (report.squadCount === 0) {
    lines.push(esc("No squad saved yet — add your 15 players in the app."));
    return lines.join("\n");
  }

  // Show the top commands (cap to keep the message tight).
  const top = report.recommendations.slice(0, 10);
  for (const r of top) {
    lines.push(`${EMOJI[r.kind]} *${esc(r.title)}*`);
    lines.push(`   ${esc(r.detail)}`);
  }

  if (report.recommendations.length === 0) {
    lines.push(esc("✅ No actions needed — your squad looks set."));
  }

  return lines.join("\n");
}

function formatH(h: number): string {
  if (h >= 48) return `${Math.round(h / 24)}d`;
  if (h >= 24) return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
  return `${h.toFixed(0)}h`;
}

// AI Coach verdict as a Telegram MarkdownV2 block.
export function formatAIDecision(d: AIDecision): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("*🤖 AI Coach*");
  lines.push(esc(d.verdict));
  lines.push(`©️ *Captain:* ${esc(d.captain.player)} — ${esc(d.captain.reason)}`);
  lines.push(`Ⓥ *Vice:* ${esc(d.viceCaptain.player)}`);
  if (d.transfers.length) {
    lines.push(`🔁 *Transfers:*`);
    for (const t of d.transfers)
      lines.push(`  • ${esc(t.out)} → ${esc(t.in)} — ${esc(t.reason)}`);
  } else {
    lines.push(`🔁 *Transfers:* hold`);
  }
  if (d.chip.recommend)
    lines.push(`🎫 *Chip:* ${esc(d.chip.chip)} — ${esc(d.chip.reason)}`);
  lines.push(`📋 *Formation:* ${esc(d.formation)}`);
  return lines.join("\n");
}

export interface TelegramResult {
  ok: boolean;
  error?: string;
}

export async function sendTelegram(text: string): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return {
      ok: false,
      error:
        "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set. Add them in your env to enable Telegram delivery.",
    };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Telegram API ${res.status}: ${body.slice(0, 200)}` };
  }
  return { ok: true };
}
