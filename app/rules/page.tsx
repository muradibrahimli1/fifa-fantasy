import {
  BUDGET,
  CHIPS,
  FORMATIONS,
  SCORING,
  SQUAD_COMPOSITION,
  STAGES,
  TRANSFERS,
  TRANSFER_HIT,
} from "@/lib/rules";
import { Card } from "@/components/ui";

export const metadata = { title: "Rules · WC2026 Fantasy" };

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Official Rules</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          The same rule set the optimizer and validator enforce. Source:
          play.fifa.com/fantasy.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-semibold">Squad &amp; budget</h2>
          <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
            <li>
              15 players: {SQUAD_COMPOSITION.GK} GK · {SQUAD_COMPOSITION.DEF} DEF
              · {SQUAD_COMPOSITION.MID} MID · {SQUAD_COMPOSITION.FWD} FWD
            </li>
            <li>
              Budget ${BUDGET.initial}m → ${BUDGET.knockout}m from the Round of
              32
            </li>
            <li>Prices are fixed for the whole tournament</li>
            <li>Captain scores double; vice-captain is the backup</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Per-nation cap by stage</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {STAGES.map((s) => (
                <tr key={s.key} className="border-t border-[var(--border)]">
                  <td className="py-1 text-[var(--muted)]">{s.label}</td>
                  <td className="py-1 text-right font-semibold">
                    {s.maxPerNation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Scoring</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
            <li>Appearance: +{SCORING.appearance}</li>
            <li>Goal: +{SCORING.goal.MID}</li>
            <li>Assist: +{SCORING.assist}</li>
            <li>Penalty won: +{SCORING.penaltyWon}</li>
            <li>Pen missed: {SCORING.penaltyMissed}</li>
            <li>Clean sheet (GK/DEF): +{SCORING.cleanSheet.DEF}</li>
            <li>Clean sheet (MID): +{SCORING.cleanSheet.MID}</li>
            <li>2 conceded (GK/DEF): {SCORING.goalConcededPer2}</li>
            <li>Yellow: {SCORING.yellowCard}</li>
            <li>Red: {SCORING.redCard}</li>
            <li>Own goal: {SCORING.ownGoal}</li>
            <li>Star performer: +{SCORING.bonusStarPerformer}</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Formations</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {FORMATIONS.map((f) => (
              <span
                key={f.key}
                className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1 text-sm"
              >
                {f.key}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Transfers</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {TRANSFERS.map((t) => (
                <tr key={t.stage} className="border-t border-[var(--border)]">
                  <td className="py-1 text-[var(--muted)]">{t.stage}</td>
                  <td className="py-1 text-right font-semibold">{t.free}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Each extra transfer beyond the free allowance costs {TRANSFER_HIT}{" "}
            points.
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Chips / boosters</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {CHIPS.map((c) => (
              <li key={c.key}>
                <span className="font-medium text-[var(--accent)]">
                  {c.name}
                </span>
                <span className="text-[var(--muted)]"> — {c.description}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
