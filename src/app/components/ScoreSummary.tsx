import { type ScoreSnapshot, type StructuralBaseline, PILLARS, PILLAR_WEIGHTS } from '@/lib/types';

interface Props {
  snapshot: ScoreSnapshot;
  baseline: StructuralBaseline;
}

export function ScoreSummary({ snapshot, baseline }: Props) {
  // Baseline weighted overall — what the score would be with zero events.
  const baselineOverall =
    PILLARS.reduce((s, p) => s + baseline.pillars[p] * PILLAR_WEIGHTS[p], 0);
  const delta = snapshot.overall_score - baselineOverall;
  const deltaSign = delta >= 0 ? '+' : '';
  const deltaColor =
    Math.abs(delta) < 0.5
      ? 'text-slate-500'
      : delta > 0
        ? 'text-score-good'
        : 'text-score-bad';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <div className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Týden {snapshot.week}
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className="text-6xl font-bold tabular-nums text-slate-900">
              {snapshot.overall_score.toFixed(1)}
            </div>
            <div className={`text-2xl font-semibold tabular-nums ${deltaColor}`}>
              {deltaSign}
              {delta.toFixed(1)}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Vážený index 0–100. Baseline {baselineOverall.toFixed(1)} ({baseline.quarter}) plus {snapshot.active_events_count} aktivních událostí.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          {PILLARS.map((p) => (
            <div key={p}>
              <dt className="font-medium capitalize text-slate-500">{czechPillar(p)}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">
                {snapshot.pillars[p].toFixed(1)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function czechPillar(p: (typeof PILLARS)[number]): string {
  return {
    electoral: 'Volby',
    governance: 'Vládnutí',
    judicial: 'Justice',
    media: 'Média',
    civil: 'Svobody',
    corruption: 'Korupce',
  }[p];
}
