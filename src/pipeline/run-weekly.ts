import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchAllSources } from './fetch-sources';
import { preFilter } from './pre-filter';
import { extractEvents } from './extract-events';
import { computeScoreSnapshot } from './score';
import { validateMany, validateOrThrow } from './validate';
import {
  type Event,
  type IsoWeek,
  type ScoreSnapshot,
  type StructuralBaseline,
} from '../lib/types';

export interface RunWeeklyOptions {
  /** ISO week label that identifies the run (e.g. '2026-W17'). */
  week: IsoWeek;
  /** Quarter identifier for the structural baseline file (e.g. '2026-Q2'). */
  baselineQuarter: string;
  /** Project root; defaults to two levels above this file. Used to resolve data/, methodology/, etc. */
  projectRoot?: string;
  /** Filter source IDs to a subset (default: all RSS sources from sources.yaml). */
  sourceIds?: readonly string[];
  /** Skip live LLM calls — for plumbing tests. Pre-filter and classify are bypassed. */
  skipLlm?: boolean;
  /** Override `now` for deterministic timestamps in tests. */
  now?: Date;
  /** Optional override path for the sources YAML config (used in tests). */
  configPath?: string;
  /** Optional fetcher injection — used in tests to avoid real network. */
  fetchText?: (url: string) => Promise<string>;
}

export interface RunWeeklyResult {
  week: IsoWeek;
  fetched: number;
  preFiltered: number;
  classified: number;
  invalidEvents: number;
  scoreSnapshot: ScoreSnapshot;
  perSource: Array<{ id: string; type: string; count: number; error?: string }>;
  outputs: { eventsPath: string; scoresPath: string };
}

const DEFAULT_PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export async function runWeekly(options: RunWeeklyOptions): Promise<RunWeeklyResult> {
  const root = options.projectRoot ?? DEFAULT_PROJECT_ROOT;
  const now = options.now ?? new Date();

  // 1. Fetch all configured RSS sources, optionally filtered.
  const fetchOpts = {
    ...(options.configPath ? { configPath: options.configPath } : {}),
    ...(options.sourceIds ? { sourceIds: options.sourceIds } : {}),
    ...(options.fetchText ? { fetchText: options.fetchText } : {}),
  };
  const fetchResult = await fetchAllSources(fetchOpts);
  const articles = fetchResult.articles;

  // 2. Pre-filter via Haiku (or skip in plumbing-test mode).
  const preFiltered = options.skipLlm ? [] : await preFilter(articles);

  // 3. Classify via Sonnet (or skip). Dedupe is run inside extractEvents
  // by default — events from different RSS outlets describing the same
  // incident are merged before validation.
  const candidateEvents = options.skipLlm
    ? []
    : await extractEvents(preFiltered, { week: options.week, now });

  // 4. Validate against the JSON schema; drop invalid, log count.
  const { valid: validEvents, invalid } = await validateMany<Event>('event', candidateEvents);

  // 5. Write events file for this week (overwrites prior runs of the same week).
  const eventsDir = path.join(root, 'data', 'events');
  const eventsPath = path.join(eventsDir, `${options.week}.json`);
  await mkdir(eventsDir, { recursive: true });
  await writeFile(eventsPath, JSON.stringify(validEvents, null, 2) + '\n', 'utf-8');

  // 6. Recompute score: load baseline + every events file (including the one we just wrote).
  const baseline = await loadBaseline(root, options.baselineQuarter);
  const allEvents = await loadAllEvents(eventsDir);
  const snapshot = computeScoreSnapshot(baseline, allEvents, options.week, { now });

  // 7. Append snapshot to data/scores/timeline.json (replacing any entry for this week).
  const scoresDir = path.join(root, 'data', 'scores');
  const scoresPath = path.join(scoresDir, 'timeline.json');
  await mkdir(scoresDir, { recursive: true });
  const timeline = await loadTimeline(scoresPath);
  const filtered = timeline.filter((s) => s.week !== options.week);
  filtered.push(snapshot);
  filtered.sort((a, b) => a.week.localeCompare(b.week));
  await writeFile(scoresPath, JSON.stringify(filtered, null, 2) + '\n', 'utf-8');

  return {
    week: options.week,
    fetched: articles.length,
    preFiltered: preFiltered.length,
    classified: validEvents.length,
    invalidEvents: invalid.length,
    scoreSnapshot: snapshot,
    perSource: fetchResult.perSource,
    outputs: { eventsPath, scoresPath },
  };
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
  const eventFiles = entries.filter((f) => /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])\.json$/.test(f));
  const events: Event[] = [];
  for (const f of eventFiles) {
    const raw = await readFile(path.join(eventsDir, f), 'utf-8');
    const parsed = JSON.parse(raw) as Event[];
    events.push(...parsed);
  }
  return events;
}

async function loadTimeline(file: string): Promise<ScoreSnapshot[]> {
  try {
    const raw = await readFile(file, 'utf-8');
    return JSON.parse(raw) as ScoreSnapshot[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

interface CliArgs {
  week?: string;
  baseline?: string;
  sources?: string;
  skipLlm?: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const out: CliArgs = {};
  for (const arg of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) {
      const key = m[1] as keyof CliArgs;
      const value = m[2] ?? '';
      if (key === 'skipLlm') (out.skipLlm as boolean | undefined) = value === 'true';
      else (out[key] as string) = value;
    } else if (arg === '--skip-llm') {
      out.skipLlm = true;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.week || !args.baseline) {
    console.error(
      'Usage: pipeline:weekly --week=2026-W17 --baseline=2026-Q2 [--sources=id1,id2,...] [--skip-llm]',
    );
    process.exit(2);
  }

  const sourceIds = args.sources
    ? args.sources.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const opts: RunWeeklyOptions = {
    week: args.week as IsoWeek,
    baselineQuarter: args.baseline,
    ...(sourceIds ? { sourceIds } : {}),
    ...(args.skipLlm ? { skipLlm: true } : {}),
  };

  console.log(`▶ running weekly pipeline for ${args.week} (baseline ${args.baseline})`);
  const result = await runWeekly(opts);

  console.log('');
  console.log(`fetched:        ${result.fetched} articles`);
  console.log(`pre-filtered:   ${result.preFiltered} kept`);
  console.log(`classified:     ${result.classified} valid events (${result.invalidEvents} dropped at validation)`);
  console.log(`overall score:  ${result.scoreSnapshot.overall_score}`);
  console.log('per-pillar:');
  for (const [k, v] of Object.entries(result.scoreSnapshot.pillars)) {
    console.log(`  ${k.padEnd(11)} ${v}`);
  }
  console.log('per-source:');
  for (const s of result.perSource) {
    const tag = s.error ? `ERROR: ${s.error}` : `${s.count} items`;
    console.log(`  ${s.id.padEnd(20)} ${s.type.padEnd(6)} ${tag}`);
  }
  console.log('');
  console.log(`wrote ${result.outputs.eventsPath}`);
  console.log(`wrote ${result.outputs.scoresPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
}
