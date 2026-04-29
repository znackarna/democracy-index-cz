import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { computeScoreSnapshot } from './score';
import { validateOrThrow } from './validate';
import {
  type Event,
  type IsoWeek,
  type ScoreSnapshot,
  type StructuralBaseline,
} from '../lib/types';

/**
 * Recompute the entire data/scores/timeline.json from baseline + every events
 * file under data/events/. Used by:
 *
 * 1. The recompute-scores GH Actions workflow when a human edits an events
 *    file (typically to correct a misclassification flagged in dispute or audit).
 * 2. After a structural baseline update — re-baselines all historical snapshots
 *    against the new mapping.
 *
 * Idempotent. Does NOT call any LLM. Output ordering is week-ascending.
 */

const DEFAULT_PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export interface RecomputeOptions {
  /** Quarter id of the structural baseline file (e.g. '2026-Q2'). */
  baselineQuarter: string;
  /** Project root override; defaults to repo root inferred from this file's path. */
  projectRoot?: string;
}

export interface RecomputeResult {
  baseline: StructuralBaseline;
  weeksProcessed: number;
  snapshots: ScoreSnapshot[];
  outputPath: string;
}

export async function recomputeScores(options: RecomputeOptions): Promise<RecomputeResult> {
  const root = options.projectRoot ?? DEFAULT_PROJECT_ROOT;
  const baseline = await loadBaseline(root, options.baselineQuarter);
  const eventsDir = path.join(root, 'data', 'events');
  const allEvents = await loadAllEvents(eventsDir);

  const weeks = await listWeeks(eventsDir);
  const snapshots: ScoreSnapshot[] = [];
  for (const week of weeks) {
    snapshots.push(computeScoreSnapshot(baseline, allEvents, week));
  }
  snapshots.sort((a, b) => a.week.localeCompare(b.week));

  const scoresDir = path.join(root, 'data', 'scores');
  await mkdir(scoresDir, { recursive: true });
  const outputPath = path.join(scoresDir, 'timeline.json');
  await writeFile(outputPath, JSON.stringify(snapshots, null, 2) + '\n', 'utf-8');

  return { baseline, weeksProcessed: weeks.length, snapshots, outputPath };
}

async function loadBaseline(root: string, quarter: string): Promise<StructuralBaseline> {
  const file = path.join(root, 'data', 'structural', `${quarter}.json`);
  const raw = await readFile(file, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  return validateOrThrow<StructuralBaseline>('structural', parsed);
}

async function loadAllEvents(eventsDir: string): Promise<Event[]> {
  let entries: string[];
  try {
    entries = await readdir(eventsDir);
  } catch {
    return [];
  }
  const files = entries.filter((f) => /^\d{4}-W\d{2}\.json$/.test(f));
  const events: Event[] = [];
  for (const f of files) {
    const raw = await readFile(path.join(eventsDir, f), 'utf-8');
    events.push(...(JSON.parse(raw) as Event[]));
  }
  return events;
}

async function listWeeks(eventsDir: string): Promise<IsoWeek[]> {
  let entries: string[];
  try {
    entries = await readdir(eventsDir);
  } catch {
    return [];
  }
  const weeks = entries
    .filter((f) => /^\d{4}-W\d{2}\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, '') as IsoWeek);
  return weeks.sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// CLI entry — `npm run pipeline:recompute -- --baseline=2026-Q2`
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const baselineArg = args.find((a) => a.startsWith('--baseline='))?.split('=')[1];
  if (!baselineArg) {
    console.error('Usage: pipeline:recompute --baseline=YYYY-Qx');
    process.exit(2);
  }
  console.log(`▶ recompute scores against baseline ${baselineArg}`);
  const result = await recomputeScores({ baselineQuarter: baselineArg });
  console.log(`Processed ${result.weeksProcessed} week(s):`);
  for (const s of result.snapshots) {
    console.log(`  ${s.week}: overall=${s.overall_score}, active=${s.active_events_count}`);
  }
  console.log(`wrote ${result.outputPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
}
