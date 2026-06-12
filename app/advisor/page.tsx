"use client";

import { useEffect, useState } from "react";
import type { AdvisorReport, RecKind } from "@/lib/advisor";
import type { AIDecision } from "@/lib/ai";
import { Stat, money } from "@/components/ui";

const STORAGE_KEY = "wc2026.myteam.v1";

const KIND_STYLE: Record<RecKind, { emoji: string; color: string }> = {
  alert: { emoji: "🚨", color: "#ef4444" },
  deadline: { emoji: "⏰", color: "#f59e0b" },
  transfer: { emoji: "🔁", color: "#19e58a" },
  captain: { emoji: "©️", color: "#3b82f6" },
  lineup: { emoji: "📋", color: "#8a96b4" },
  chip: { emoji: "🎫", color: "#a855f7" },
};

export default function AdvisorPage() {
  const [ids, setIds] = useState<number[]>([]);
  const [report, setReport] = useState<AdvisorReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // AI coach
  const [ai, setAi] = useState<AIDecision | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as number[]) : [];
      setIds(parsed);
    } catch {
      setIds([]);
    }
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    setSendMsg(null);
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data.report as AdvisorReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze");
    } finally {
      setLoading(false);
    }
  }

  async function sendNow() {
    setSendMsg("Sending…");
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, send: true }),
      });
      const data = await res.json();
      if (data.telegram?.ok) setSendMsg("✅ Sent to Telegram.");
      else setSendMsg(`⚠ ${data.telegram?.error ?? "Send failed."}`);
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : "Send failed");
    }
  }

  async function askAI() {
    setAiLoading(true);
    setAiError(null);
    setAi(null);
    try {
      const res = await fetch("/api/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "AI request failed");
      setAi(data.decision as AIDecision);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setAiLoading(false);
    }
  }

  // Auto-run on first load once we have ids.
  useEffect(() => {
    if (ids.length > 0 && !report) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const idString = ids.join(",");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Advisor — your commands</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Live analysis of your squad: what to transfer, who to captain, your
            lineup, chip timing, and alerts. This is exactly what the 24/7
            Telegram bot sends.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm font-medium hover:bg-[var(--panel-2)] disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Re-analyze"}
          </button>
          <button
            onClick={sendNow}
            disabled={ids.length === 0}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
          >
            Send to Telegram
          </button>
        </div>
      </div>

      {sendMsg && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-sm">
          {sendMsg}
        </div>
      )}

      {ids.length === 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          No squad saved yet. Go to{" "}
          <a href="/team" className="text-[var(--accent)] underline">
            My Team
          </a>{" "}
          and add your 15 players first.
        </div>
      )}

      {/* AI Coach */}
      {ids.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: "#a855f755",
            background:
              "linear-gradient(180deg, rgba(168,85,247,0.10), rgba(59,130,246,0.05))",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              🤖 AI Coach
              <span className="text-xs font-normal text-[var(--muted)]">
                GPT decides your round
              </span>
            </h2>
            <button
              onClick={askAI}
              disabled={aiLoading}
              className="rounded-lg bg-[#a855f7] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {aiLoading ? "Thinking…" : ai ? "Ask again" : "Get AI decision"}
            </button>
          </div>

          {aiError && (
            <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
              {aiError}
            </div>
          )}

          {ai && (
            <div className="mt-4 space-y-3">
              <p className="rounded-lg bg-black/20 p-3 text-sm leading-relaxed">
                {ai.verdict}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <AIBlock title="©️ Captain">
                  <b className="text-[var(--accent)]">{ai.captain.player}</b>
                  <span className="text-[var(--muted)]"> — {ai.captain.reason}</span>
                </AIBlock>
                <AIBlock title="Ⓥ Vice-captain">
                  <b>{ai.viceCaptain.player}</b>
                  <span className="text-[var(--muted)]">
                    {" "}— {ai.viceCaptain.reason}
                  </span>
                </AIBlock>
              </div>

              <AIBlock title={`🔁 Transfers (${ai.transfers.length})`}>
                {ai.transfers.length === 0 ? (
                  <span className="text-[var(--muted)]">
                    Hold — no transfer worth making this round.
                  </span>
                ) : (
                  <ul className="space-y-1">
                    {ai.transfers.map((t, i) => (
                      <li key={i}>
                        <b className="text-red-400">{t.out}</b> →{" "}
                        <b className="text-[var(--accent)]">{t.in}</b>
                        <span className="text-[var(--muted)]"> — {t.reason}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </AIBlock>

              <div className="grid gap-3 sm:grid-cols-2">
                <AIBlock title="🎫 Chip">
                  {ai.chip.recommend ? (
                    <>
                      <b className="text-[#a855f7]">{ai.chip.chip}</b>
                      <span className="text-[var(--muted)]"> — {ai.chip.reason}</span>
                    </>
                  ) : (
                    <span className="text-[var(--muted)]">
                      Save your chips. {ai.chip.reason}
                    </span>
                  )}
                </AIBlock>
                <AIBlock title="📋 Formation">
                  <b>{ai.formation}</b>
                </AIBlock>
              </div>

              {ai.keyRisks.length > 0 && (
                <AIBlock title="⚠ Key risks">
                  <ul className="list-inside list-disc text-[var(--muted)]">
                    {ai.keyRisks.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </AIBlock>
              )}
            </div>
          )}

          {!ai && !aiLoading && !aiError && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              Let GPT weigh your squad, fixtures, and budget and make the call on
              captain, transfers, chip and formation.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {error}
        </div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Stage" value={report.stageLabel} />
            <Stat
              label="Deadline"
              value={
                report.deadlineInHours != null && report.deadlineInHours > 0
                  ? formatH(report.deadlineInHours)
                  : "—"
              }
              accent
            />
            <Stat label="Proj XI" value={report.projectedXI.toFixed(1)} />
            <Stat label="Bank" value={money(report.bank)} />
          </div>

          <div className="space-y-2">
            {report.recommendations.length === 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
                ✅ No actions needed — your squad looks set.
              </div>
            )}
            {report.recommendations.map((r, i) => {
              const s = KIND_STYLE[r.kind];
              return (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3"
                  style={{ borderLeft: `3px solid ${s.color}` }}
                >
                  <div className="text-xl">{s.emoji}</div>
                  <div>
                    <div className="text-sm font-semibold">{r.title}</div>
                    <div className="text-xs text-[var(--muted)]">{r.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Cron setup helper */}
      {ids.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <h2 className="text-sm font-semibold">Enable 24/7 Telegram alerts</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            To let the scheduled bot analyze this squad while the app is closed,
            set this as the <code>MY_SQUAD_IDS</code> environment variable in
            Vercel (Project → Settings → Environment Variables), then redeploy.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-xs">
              {idString}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(idString);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs hover:bg-[var(--panel-2)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatH(h: number): string {
  if (h >= 48) return `${Math.round(h / 24)}d`;
  if (h >= 24) return `${Math.floor(h / 24)}d ${Math.round(h % 24)}h`;
  return `${h.toFixed(0)}h`;
}

function AIBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-black/20 p-3 text-sm">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-[var(--muted)]">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
