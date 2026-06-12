import { getDataset } from "@/lib/fifa/client";
import { PlayerExplorer } from "@/components/PlayerExplorer";
import { Stat } from "@/components/ui";

export const revalidate = 900;

export default async function DashboardPage() {
  let data;
  try {
    data = await getDataset();
  } catch (err) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6">
        <h1 className="text-lg font-semibold">Couldn’t reach the FIFA feed</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {err instanceof Error ? err.message : "Unknown error"}. The official
          endpoint may be temporarily unavailable — try again shortly.
        </p>
      </div>
    );
  }

  const available = data.players.filter((p) => p.available);
  const activeRound = data.rounds.find((r) => r.id === data.activeRoundId);
  const topForm = [...available]
    .sort((a, b) => b.form - a.form)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Player Research</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Every player in the official World Cup 2026 Fantasy game, with live
          prices, form, ownership, and a projected-points model. Click any
          player for detail.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Players" value={available.length} />
        <Stat
          label="Active round"
          value={activeRound ? `R${activeRound.id}` : "—"}
          accent
        />
        <Stat label="Nations" value={data.nations.length} />
        <Stat
          label="In form"
          value={topForm ? `${topForm.name.split(" ").slice(-1)}` : "—"}
        />
      </div>

      <PlayerExplorer
        players={data.players}
        nations={data.nations}
        fixtures={data.fixtures}
      />
    </div>
  );
}
