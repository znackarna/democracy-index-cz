import { EventsList } from '../components/EventsList';
import { InfoBox } from '../components/InfoBox';
import { PageContainer } from '../components/PageContainer';
import { readAllEvents } from '../lib/data';
import { PILLARS, type Pillar } from '@/lib/types';
import { getMessages, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
}

export async function EventsView({ locale }: Props) {
  const t = getMessages(locale);
  const events = await readAllEvents();

  const counts: Record<Pillar, number> = {
    electoral: 0,
    governance: 0,
    judicial: 0,
    media: 0,
    civil: 0,
    corruption: 0,
  };
  const weeks = new Set<string>();
  for (const e of events) {
    counts[e.pillar] += 1;
    const m = /^(\d{4}-W\d{2})-/.exec(e.id);
    if (m) weeks.add(m[1]!);
  }

  const pillarLabels = Object.fromEntries(
    PILLARS.map((p) => [p, t.pillars[p].short]),
  ) as Record<Pillar, string>;

  return (
    <PageContainer>
    <div className="space-y-8">
      <section>
        <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">03 — {t.eventLog.eyebrow.split('— ')[1] ?? 'Události'}</div>
        <h1 className="mt-2 mb-3 text-3xl font-medium tracking-tight md:text-4xl">
          {t.events.pageTitle}
        </h1>
        <p className="max-w-3xl text-[15px] text-black/65">{t.events.pageIntro}</p>
      </section>

      <InfoBox
        locale={locale}
        title={t.events.severityInfoTitle}
        readMore={{ doc: 'severity' }}
      >
        <ul className="space-y-1">
          <li>
            <strong>1</strong> — {t.severity.items[1]}
          </li>
          <li>
            <strong>2</strong> — {t.severity.items[2]}
          </li>
          <li>
            <strong>3</strong> — {t.severity.items[3]}
          </li>
          <li>
            <strong>4</strong> — {t.severity.items[4]}
          </li>
          <li>
            <strong>5</strong> — {t.severity.items[5]}
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          <strong>{t.events.directionExplain.bold}</strong>
          {t.events.directionExplain.tail}
        </p>
        <p className="text-xs text-slate-500">
          <strong>{t.events.statusExplain.bold}</strong>
          {t.events.statusExplain.colon}
          <code>{t.events.statusExplain.activeCode}</code>
          {t.events.statusExplain.activeNote}
          <code>{t.events.statusExplain.persistentCode}</code>
          {t.events.statusExplain.persistentNote}
          <code>{t.events.statusExplain.resolvedCode}</code>
          {t.events.statusExplain.midClose}
          <code>{t.events.statusExplain.disputedCode}</code>
          {t.events.statusExplain.disputedNote}
          <code>{t.events.statusExplain.needsReviewCode}</code>
          {t.events.statusExplain.needsReviewNote}
        </p>
      </InfoBox>

      <section className="border border-black/15 bg-paper p-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="text-slate-500">
            <span className="font-semibold text-slate-900 tabular-nums">{events.length}</span>{' '}
            {t.events.countTotal} ·{' '}
            <span className="font-semibold text-slate-900 tabular-nums">{weeks.size}</span>{' '}
            {t.events.countWeeks}
          </div>
          <div className="flex flex-wrap gap-3">
            {PILLARS.map((p) => (
              <span key={p} className="text-slate-500">
                {pillarLabels[p]}{' '}
                <span className="font-semibold text-slate-900 tabular-nums">{counts[p]}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <EventsList
        locale={locale}
        events={events}
        labels={{
          pillars: pillarLabels,
          filterPillar: t.events.filterPillar,
          filterSeverity: t.events.filterSeverity,
          filterYear: t.events.filterYear,
          filterAllYears: t.events.filterAllYears,
          filterClear: t.events.filterClear,
          countSummaryTotal: t.events.countSummaryTotal,
          countSummaryFiltered: t.events.countSummaryFiltered,
          countSummaryOf: t.events.countSummaryOf,
          pageLabel: t.events.pageLabel,
          pageOf: t.events.pageOf,
          weekHeading: t.events.weekHeading,
          emptyFiltered: t.events.emptyFiltered,
          emptyAll: t.events.emptyAll,
          paginationPrev: t.events.paginationPrev,
          paginationNext: t.events.paginationNext,
        }}
      />
    </div>
    </PageContainer>
  );
}
