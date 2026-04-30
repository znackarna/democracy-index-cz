import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  baselineWeightedOverall,
  computeIndexComparisons,
  type IndexComparison,
} from '@/lib/external-comparison';
import {
  PollSeriesSchema,
  TopicalFindingsFileSchema,
  type Event,
  type PollSeries,
  type ScoreSnapshot,
  type StructuralBaseline,
  type TopicalFindingsFile,
} from '@/lib/types';

// Data lives at the repo root. From src/app/lib/ we go up three levels.
const DATA_ROOT = path.resolve(process.cwd(), 'data');

/**
 * Read every weekly snapshot from data/scores/timeline.json. Returns sorted
 * oldest-first. If the file does not exist (fresh repo), returns [].
 */
export async function readTimeline(): Promise<ScoreSnapshot[]> {
  const file = path.join(DATA_ROOT, 'scores', 'timeline.json');
  try {
    const raw = await readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as ScoreSnapshot[];
    return [...parsed].sort((a, b) => a.week.localeCompare(b.week));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Read every event from every weekly file under data/events/. Returns sorted
 * newest-first by event date.
 */
export async function readAllEvents(): Promise<Event[]> {
  const dir = path.join(DATA_ROOT, 'events');
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  const files = entries.filter((f) => /^\d{4}-W\d{2}\.json$/.test(f));
  const events: Event[] = [];
  for (const f of files) {
    const raw = await readFile(path.join(dir, f), 'utf-8');
    events.push(...(JSON.parse(raw) as Event[]));
  }
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

/** Read the active structural baseline file given a quarter identifier. */
export async function readBaseline(quarter: string): Promise<StructuralBaseline> {
  const file = path.join(DATA_ROOT, 'structural', `${quarter}.json`);
  const raw = await readFile(file, 'utf-8');
  return JSON.parse(raw) as StructuralBaseline;
}

/**
 * Convenience: latest snapshot + the baseline it references. Falls back to a
 * synthesised "no data yet" placeholder if the timeline is empty so pages
 * never have to handle null.
 */
export async function readLatest(): Promise<{
  snapshot: ScoreSnapshot | null;
  baseline: StructuralBaseline | null;
}> {
  const timeline = await readTimeline();
  const last = timeline.at(-1);
  if (!last) return { snapshot: null, baseline: null };
  const baseline = await readBaseline(last.structural_baseline);
  return { snapshot: last, baseline };
}

/**
 * Per-source comparison of our index against external benchmarks. Used by the
 * IndexComparison component on the homepage. Single-dim indices (RSF, TI,
 * WJP) compare to a specific pillar; multi-dim composites (V-Dem, EIU, FH)
 * compare to weighted overall. Returns empty array if baseline is missing.
 */
export async function readIndexComparisons(): Promise<{
  baselineQuarter: string | null;
  baselineWeighted: number | null;
  comparisons: IndexComparison[];
}> {
  const { baseline } = await readLatest();
  if (!baseline) {
    return { baselineQuarter: null, baselineWeighted: null, comparisons: [] };
  }
  return {
    baselineQuarter: baseline.quarter,
    baselineWeighted: baselineWeightedOverall(baseline),
    comparisons: computeIndexComparisons(baseline),
  };
}

/**
 * Read every poll-time-series file from data/public_opinion/. Each file je
 * jeden source (CVVM, STEM, Median, EB...). Topical findings (`topical.json`)
 * jsou ad-hoc nálezy mimo time series — read-em odděleně přes readTopicalFindings.
 *
 * Read-only zobrazení — TYTO HODNOTY NEVSTUPUJÍ DO SKÓRE. Slouží jen jako
 * doplňkový kontext na dashboardu (viz methodology/public_opinion.md).
 */
export async function readPollSeries(): Promise<PollSeries[]> {
  const dir = path.join(DATA_ROOT, 'public_opinion');
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
  // Vše kromě "topical.json" (jiný shape) a non-JSON souborů.
  const seriesFiles = entries.filter(
    (f) => f.endsWith('.json') && f !== 'topical.json',
  );
  const series: PollSeries[] = [];
  for (const f of seriesFiles) {
    const raw = await readFile(path.join(dir, f), 'utf-8');
    const parsed = PollSeriesSchema.safeParse(JSON.parse(raw));
    if (parsed.success) series.push(parsed.data);
    // Tichá tolerance malformed file — nezbouráme dashboard kvůli jednomu
    // souboru. Při buildu by se nemělo stát; review při manuálním ingestu.
  }
  // Sort: CVVM (academic gold standard) první, pak komerční, pak EU.
  const orderHint = ['cvvm', 'stem', 'median', 'eurobarometer', 'globsec'];
  series.sort((a, b) => {
    const ia = orderHint.indexOf(a.source);
    const ib = orderHint.indexOf(b.source);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return series;
}

export async function readTopicalFindings(): Promise<TopicalFindingsFile | null> {
  const file = path.join(DATA_ROOT, 'public_opinion', 'topical.json');
  try {
    const raw = await readFile(file, 'utf-8');
    const parsed = TopicalFindingsFileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    // Sort newest-first.
    return {
      ...parsed.data,
      items: [...parsed.data.items].sort((a, b) => b.date.localeCompare(a.date)),
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}
