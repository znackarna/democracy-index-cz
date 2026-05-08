import Link from 'next/link';
import type { Event } from '@/lib/types';
import { eventsPath, getMessages, type Locale } from '@/i18n';
import { formatShortDate } from '@/i18n/dates';

interface Props {
  locale: Locale;
  /** Events for the current week (typically the latest snapshot's week). */
  events: readonly Event[];
  /** ISO week label for the active week chip, e.g. "2026-W19". */
  currentWeek: string;
  /** Previous week labels for inactive chips (display only). */
  previousWeekLabels: readonly string[];
}

/**
 * Editorial event log per redesign-v2.
 *
 * Left column (3-cols): eyebrow, H2, intro paragraph, week chip filters.
 * Right column (9-cols): ordered list of events for the active week, each
 * row a 12-col grid (date · headline+source · pillar tag · impact + label).
 */
export function EventLog({ locale, events, currentWeek, previousWeekLabels }: Props) {
  const t = getMessages(locale);
  const E = t.eventLog;
  const repoUrl = t.meta.repoUrl;

  // Sort newest-first within the displayed week.
  const ordered = [...events].sort((a, b) => b.date.localeCompare(a.date));

  // Week-summary line: sum of impacts, count, distinct outlets.
  const sum = ordered.reduce((acc, e) => acc + e.score_impact, 0);
  const sources = new Set<string>();
  for (const e of ordered) for (const s of e.sources) sources.add(s.outlet);
  const sumLabel =
    (sum >= 0 ? '+' : '−') + Math.abs(sum).toFixed(1).replace('.', locale === 'cs' ? ',' : '.');
  const summary = E.summaryTemplate
    .replace('{sum}', sumLabel)
    .replace('{count}', String(ordered.length))
    .replace('{sources}', String(sources.size));

  // Current week number for the active filter chip ("Týden 19").
  const currentWeekNum = /-W(\d{2})$/.exec(currentWeek)?.[1];
  const currentChipLabel = currentWeekNum
    ? `${E.weekChipPrefix} ${Number(currentWeekNum)}`
    : currentWeek;

  return (
    <section id="udalosti" className="border-b border-black">
      <div className="mx-auto max-w-editorial px-6 py-14 md:px-10">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">{E.eyebrow}</div>
            <h2 className="mt-2 text-3xl font-medium tracking-tight">{E.title}</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-black/65">
              {E.intro
                .split('{repoLink}')
                .map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {E.introRepoLink}
                      </a>
                    )}
                  </span>
                ))}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em]">
              <span className="border border-black px-2 py-1">{currentChipLabel}</span>
              {previousWeekLabels.slice(0, 3).map((wk) => {
                const m = /-W(\d{2})$/.exec(wk);
                const label = m ? `${E.weekChipPrefix} ${Number(m[1])}` : wk;
                return (
                  <span
                    key={wk}
                    className="border border-black/20 px-2 py-1 text-black/55"
                    title="Plný archiv"
                  >
                    {label}
                  </span>
                );
              })}
              <Link
                href={eventsPath(locale)}
                className="border border-black/20 px-2 py-1 text-black/55 transition hover:border-black hover:text-black"
              >
                {E.archiveChip}
              </Link>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            {ordered.length === 0 ? (
              <div className="border-t border-black py-10 text-[14px] text-black/55">
                {E.emptyWeek}
              </div>
            ) : (
              <ol className="divide-y divide-black/10 border-t border-black font-mono text-[13px]">
                {ordered.map((e) => (
                  <EventRow key={e.id} locale={locale} event={e} labels={E.impactLabels} />
                ))}
              </ol>
            )}

            <div className="mt-6 flex items-center justify-between text-[12px] text-black/55">
              <span className="font-mono num">{summary}</span>
              <Link href={eventsPath(locale)} className="underline underline-offset-2 hover:text-black">
                {E.fullArchiveLink}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventRow({
  locale,
  event,
  labels,
}: {
  locale: Locale;
  event: Event;
  labels: { severe: string; positive: string; minor: string; neutral: string };
}) {
  const t = getMessages(locale);
  const headline = locale === 'en' ? (event.headline_en ?? event.headline) : event.headline;
  const dateLabel = formatShortDate(event.date, locale);
  const impact = event.score_impact;
  const impactStr =
    Math.abs(impact) < 0.05
      ? '±0.0'
      : (impact >= 0 ? '+' : '−') +
        Math.abs(impact).toFixed(1).replace('.', locale === 'cs' ? ',' : '.');

  // Severity → editorial label per design ("vážný / pozitivní / menší / neutrální").
  const sev = event.severity ?? 0;
  let impactLabel: string;
  if (Math.abs(impact) < 0.05) impactLabel = labels.neutral;
  else if (impact > 0) impactLabel = labels.positive;
  else if (sev >= 3) impactLabel = labels.severe;
  else impactLabel = labels.minor;

  // Outlet line: first source's outlet + count fallback.
  const outletLine = event.sources
    .slice(0, 2)
    .map((s) => s.outlet)
    .join(' · ');

  // Pillar label e.g. "Vládnutí" — use translated short name.
  const pillarLabel = t.pillars[event.pillar].short;

  return (
    <li className="grid grid-cols-12 gap-4 py-5">
      <div className="col-span-12 num text-black/55 md:col-span-2">{dateLabel}</div>
      <div className="col-span-12 md:col-span-7">
        <div className="font-sans text-[15px] leading-snug text-black">{headline}</div>
        <div className="mt-1 text-[12px] text-black/55">{outletLine}</div>
      </div>
      <div className="col-span-6 flex items-start gap-2 md:col-span-2">
        <span className="border border-black px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
          {pillarLabel}
        </span>
      </div>
      <div className="col-span-6 text-right num md:col-span-1">
        <span className="text-black">{impactStr}</span>
        <div className="text-[10px] uppercase tracking-wider text-black/45">{impactLabel}</div>
      </div>
    </li>
  );
}
