import { EventCard } from '../components/EventCard';
import { InfoBox } from '../components/InfoBox';
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

      <InfoBox title="Co znamená severity 1–5" readMore={{ slug: 'severity' }}>
        <ul className="space-y-1">
          <li>
            <strong>1</strong> — zanedbatelný incident, výroky bez institucionálního dopadu
            (±0.2 b. do pilíře).
          </li>
          <li>
            <strong>2</strong> — drobný jednorázový incident s lokálním dopadem (±0.5 b.).
          </li>
          <li>
            <strong>3</strong> — významný incident, široký dopad nebo precedent (±1.5 b.).
          </li>
          <li>
            <strong>4</strong> — závažné porušení normy nebo procesu (±3.0 b.).
          </li>
          <li>
            <strong>5</strong> — strukturální posun, ústavní krize, systémová změna (±6.0 b.).
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          <strong>Direction</strong> ±1: zda událost demokratické instituce posiluje (+) nebo
          oslabuje (−). Anti-corruption raid od NCOZ má direction +1, i když se podezírá
          z korupce — institucemi se vymáhá právo.
        </p>
        <p className="text-xs text-slate-500">
          <strong>Status</strong>: <code>active</code> (započítává se), <code>persistent</code>{' '}
          (trvalá vrstva, dokud reviewer neuzavře jako <code>resolved</code>),{' '}
          <code>disputed</code> (rozpor v pokrytí napříč zdroji), <code>needs_review</code>{' '}
          (auditor flagnul nebo klasifikátor nebyl jistý).
        </p>
      </InfoBox>

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
