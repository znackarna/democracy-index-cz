import Link from 'next/link';
import { ScoreSummary } from './components/ScoreSummary';
import { ScoreTimeline } from './components/ScoreTimeline';
import { PillarBreakdown } from './components/PillarBreakdown';
import { EventCard } from './components/EventCard';
import { readAllEvents, readLatest, readTimeline } from './lib/data';

export default async function HomePage() {
  const [{ snapshot, baseline }, timeline, allEvents] = await Promise.all([
    readLatest(),
    readTimeline(),
    readAllEvents(),
  ]);

  const recentEvents = allEvents.slice(0, 5);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
          Stav demokracie ČR
        </h1>
        <p className="max-w-3xl text-slate-600">
          Týdně aktualizovaný kompozitní index 0–100. Strukturální baseline z V-Dem 2024,
          EIU 2024, Freedom House 2025, RSF 2025, TI CPI 2024 a WJP 2024 plus týdenní
          úpravy podle konkrétních událostí. Klasifikuje{' '}
          <span className="font-mono text-sm">claude-sonnet-4-6</span>, skóre počítá
          deterministická TS funkce s unit testy.
        </p>
      </section>

      {snapshot && baseline ? (
        <>
          <ScoreSummary snapshot={snapshot} baseline={baseline} />

          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Vývoj skóre</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ScoreTimeline snapshots={timeline} />
              {timeline.length === 1 && (
                <p className="mt-2 text-xs text-slate-500">
                  První snapshot — historie se buduje od týdne {timeline[0]?.week}.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-slate-900">Skóre po pilířích</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <PillarBreakdown snapshot={snapshot} baseline={baseline} />
              <p className="mt-2 text-xs text-slate-500">
                Sloupce = aktuální týden. Černé tečky = strukturální baseline (
                {baseline.quarter}). Diference ukazuje, jak události tohoto kvartálu
                posunuly pilíř.
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <p>Zatím žádný snapshot. První běh pipeline vytvoří snapshot pro aktuální týden.</p>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Nejnovější události</h2>
          <Link href="/events/" className="text-sm text-slate-600 underline hover:text-slate-900">
            Všechny události →
          </Link>
        </div>
        {recentEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Zatím žádné události.
          </div>
        ) : (
          <div className="space-y-4">
            {recentEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
