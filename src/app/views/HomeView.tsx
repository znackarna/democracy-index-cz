import { Hero } from '../components/Hero';
import { PillarsTable } from '../components/PillarsTable';
import { EventLog } from '../components/EventLog';
import { BenchmarksTable } from '../components/BenchmarksTable';
import { PublicOpinionSection } from '../components/PublicOpinionSection';
import { Manifest } from '../components/Manifest';
import {
  readAllEvents,
  readLatest,
  readPollSeries,
  readTimeline,
  readTopicalFindings,
} from '../lib/data';
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
  const [{ snapshot, baseline }, timeline, allEvents, pollSeries, topical] = await Promise.all([
    readLatest(),
    readTimeline(),
    readAllEvents(),
    readPollSeries(),
    readTopicalFindings(),
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
  // Top 5 most recent events across all weeks — matches the original
  // homepage's editorial selection. Filtering strictly to the current
  // ISO week made the home empty mid-week, which read as "nothing
  // happened" rather than the actual "this is the most recent activity".
  // Full archive lives at /udalosti/.
  const recentEvents = allEvents.slice(0, 5);
  // Broader window for the pillars table's "Hlavní signál" cell — give
  // each pillar a fair shot at the most relevant headline even on quiet
  // weeks.
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
        events={recentEvents}
        currentWeek={currentWeek}
        previousWeekLabels={previousWeekLabels}
      />
      <BenchmarksTable locale={locale} baseline={baseline} />
      <PublicOpinionSection
        locale={locale}
        series={pollSeries}
        topical={topical?.items ?? null}
        {...(topical?.description ? { topicalDescription: topical.description } : {})}
      />
      <Manifest locale={locale} />
    </>
  );
}
