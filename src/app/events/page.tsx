import { EventCard } from '../components/EventCard';
import { readAllEvents } from '../lib/data';
import { PILLARS, type Pillar } from '@/lib/types';

const PILLAR_LABEL: Record<Pillar, string> = {
  electoral: 'Volby',
  governance: 'Vládnutí',
  judicial: 'Justice',
  media: 'Média',
  civil: 'Svobody',
  corruption: 'Korupce',
};

export default async function EventsPage() {
  const events = await readAllEvents();

  // Group by week so the page reads as a chronological log.
  const byWeek = new Map<string, typeof events>();
  for (const e of events) {
    const week = weekFromId(e.id);
    if (!week) continue;
    const arr = byWeek.get(week) ?? [];
    arr.push(e);
    byWeek.set(week, arr);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => b.localeCompare(a));

  // Per-pillar summary across all events.
  const counts: Record<Pillar, number> = {
    electoral: 0,
    governance: 0,
    judicial: 0,
    media: 0,
    civil: 0,
    corruption: 0,
  };
  for (const e of events) counts[e.pillar] += 1;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Všechny události</h1>
        <p className="max-w-3xl text-slate-600">
          Auditovatelný seznam všech klasifikovaných událostí. Každá má odkaz na zdroje a
          tlačítko „Napadnout klasifikaci" — disputy se řeší jako GitHub issues.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="text-slate-500">
            <span className="font-semibold text-slate-900 tabular-nums">{events.length}</span>{' '}
            celkem ·{' '}
            <span className="font-semibold text-slate-900 tabular-nums">{weeks.length}</span>{' '}
            týdnů
          </div>
          <div className="flex flex-wrap gap-3">
            {PILLARS.map((p) => (
              <span key={p} className="text-slate-500">
                {PILLAR_LABEL[p]}{' '}
                <span className="font-semibold text-slate-900 tabular-nums">{counts[p]}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {weeks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Zatím žádné události.
        </div>
      ) : (
        weeks.map((week) => (
          <section key={week}>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Týden {week}</h2>
            <div className="space-y-4">
              {byWeek.get(week)?.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function weekFromId(id: string): string | null {
  const m = /^(\d{4}-W\d{2})-/.exec(id);
  return m ? m[1]! : null;
}
