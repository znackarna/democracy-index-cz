import { Hero } from '../components/Hero';
import { PillarsTable } from '../components/PillarsTable';
import { EventLog } from '../components/EventLog';
import { BenchmarksTable } from '../components/BenchmarksTable';
import { Manifest } from '../components/Manifest';
import { readAllEvents, readLatest, readTimeline } from '../lib/data';
import type { Locale } from '@/i18n';

interface Props {
  locale: Locale;
}

/**
 * Single-page editorial home per redesign-v2.
 *
 * Sections in order:
 *   1. Hero (#prehled) — masthead-bordered hero with score + sparkline
 *   2. PillarsTable (#pilire) — six rows + per-pillar trend
 *   3. EventLog (#udalosti) — current week's events with archive link
 *   4. BenchmarksTable (#srovnani) — external indices snapshot
 *   5. Manifest — black-section editorial closer
 *
 * Public opinion (CVVM) and cross-country charts are NOT on the home page
 * by design — they live on /srovnani/ as part of "external context", with
 * their own restyle to match the editorial language. The methodology
 * archive lives at /metodika/.
 */
export async function HomeView({ locale }: Props) {
  const [{ snapshot, baseline }, timeline, allEvents] = await Promise.all([
    readLatest(),
    readTimeline(),
    readAllEvents(),
  ]);

  if (!snapshot || !baseline) {
    // Fresh repo, no first snapshot yet — render an empty editorial state
    // rather than a half-broken hero with NaN.
    return (
      <div className="mx-auto max-w-editorial px-6 py-20 text-center text-black/55 md:px-10">
        <p>Připravujeme první snapshot. Zkuste to za pár minut.</p>
      </div>
    );
  }

  const prevSnapshot = timeline.length >= 2 ? (timeline[timeline.length - 2] ?? null) : null;
  const currentWeek = snapshot.week;
  const currentWeekEvents = allEvents.filter((e) => e.id.startsWith(`${currentWeek}-`));
  // Most recent events across pillars feed the "Hlavní signál" cell in
  // the pillars table — broaden window to last 4 weeks so quiet weeks
  // still surface a meaningful headline per pillar.
  const recentEventsForSignals = allEvents.slice(0, 80);
  const previousWeekLabels = timeline
    .slice(-4, -1)
    .map((s) => s.week)
    .reverse();

  return (
    <>
      <Hero
        locale={locale}
        snapshot={snapshot}
        baseline={baseline}
        timeline={timeline}
        prevSnapshot={prevSnapshot}
      />
      <PillarsTable
        locale={locale}
        snapshot={snapshot}
        baseline={baseline}
        timeline={timeline}
        prevSnapshot={prevSnapshot}
        recentEvents={recentEventsForSignals}
      />
      <EventLog
        locale={locale}
        events={currentWeekEvents}
        currentWeek={currentWeek}
        previousWeekLabels={previousWeekLabels}
      />
      <BenchmarksTable locale={locale} baseline={baseline} />
      <Manifest locale={locale} />
    </>
  );
}
