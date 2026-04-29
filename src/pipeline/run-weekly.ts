import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyAuditVerdicts, auditEvents, type AuditResult } from './audit';
import { capSeverityBySourceCount, type CapAdjustment } from './cap-severity';
import { detectAnomalies, type Anomaly } from './detect-anomalies';
import { extractEvents } from './extract-events';
import { fetchAllSources } from './fetch-sources';
import { preFilter } from './pre-filter';
import { writeDailyReport } from './report';
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
  /** Skip live LLM calls — for plumbing tests. Pre-filter, classify, AND audit are bypassed. */
  skipLlm?: boolean;
  /** Skip only the audit pass (useful for cheap re-runs without paying for auditor). */
  skipAudit?: boolean;
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
  cappedEvents: CapAdjustment[];
  audit: AuditResult | null;
  anomalies: Anomaly[];
  scoreSnapshot: ScoreSnapshot;
  perSource: Array<{ id: string; type: string; count: number; error?: string }>;
  outputs: { eventsPath: string; scoresPath: string; reportPath: string | null };
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

  // 5. Source-count → severity cap (deterministic rule per governance.md).
  const { events: cappedSeverity, capped } = capSeverityBySourceCount(validEvents);

  // 6. Self-audit pass (skip if no events or skipLlm/skipAudit).
  const skipAudit = options.skipLlm === true || options.skipAudit === true;
  const audit =
    skipAudit || cappedSeverity.length === 0
      ? null
      : await auditEvents(cappedSeverity);
  const finalEvents = audit ? applyAuditVerdicts(cappedSeverity, audit) : cappedSeverity;

  // 7. Write events file for this week (overwrites prior runs of the same week).
  const eventsDir = path.join(root, 'data', 'events');
  const eventsPath = path.join(eventsDir, `${options.week}.json`);
  await mkdir(eventsDir, { recursive: true });
  await writeFile(eventsPath, JSON.stringify(finalEvents, null, 2) + '\n', 'utf-8');

  // 8. Recompute score: load baseline + every events file (including the one we just wrote).
  const baseline = await loadBaseline(root, options.baselineQuarter);
  const allEvents = await loadAllEvents(eventsDir);
  const snapshot = computeScoreSnapshot(baseline, allEvents, options.week, { now });

  // 9. Append snapshot to data/scores/timeline.json (replacing any entry for this week).
  const scoresDir = path.join(root, 'data', 'scores');
  const scoresPath = path.join(scoresDir, 'timeline.json');
  await mkdir(scoresDir, { recursive: true });
  const timeline = await loadTimeline(scoresPath);
  const prevSnapshot = timeline.find((s) => s.week !== options.week && s.week < options.week);
  const filtered = timeline.filter((s) => s.week !== options.week);
  filtered.push(snapshot);
  filtered.sort((a, b) => a.week.localeCompare(b.week));
  await writeFile(scoresPath, JSON.stringify(filtered, null, 2) + '\n', 'utf-8');

  // 10. Detect anomalies (deterministic, ne-blokující — index už zapsán).
  const anomalies = detectAnomalies({
    events: finalEvents,
    newSnapshot: snapshot,
    ...(prevSnapshot ? { prevSnapshot } : {}),
    ...(audit ? { audit } : {}),
  });

  // 11. Write daily report (skipped only in skipLlm tests where no events flow).
  let reportPath: string | null = null;
  if (!options.skipLlm) {
    reportPath = await writeDailyReport(
      {
        date: now,
        week: options.week,
        perSource: fetchResult.perSource,
        fetched: articles.length,
        preFiltered: preFiltered.length,
        events: finalEvents,
        cappedEvents: capped,
        ...(audit ? { audit } : {}),
        ...(prevSnapshot ? { prevSnapshot } : {}),
        newSnapshot: snapshot,
        anomalies,
      },
      root,
    );
  }

  return {
    week: options.week,
    fetched: articles.length,
    preFiltered: preFiltered.length,
    classified: validEvents.length,
    invalidEvents: invalid.length,
    cappedEvents: capped,
    audit,
    anomalies,
    scoreSnapshot: snapshot,
    perSource: fetchResult.perSource,
    outputs: { eventsPath, scoresPath, reportPath },
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
  skipAudit?: boolean;
  /** Path where anomalies (if any) are written as JSON array. Used by GH Actions to open issues. */
  emitAnomaliesJson?: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const out: CliArgs = {};
  for (const arg of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) {
      const rawKey = m[1] ?? '';
      const value = m[2] ?? '';
      // Convert kebab-case CLI flags to camelCase keys.
      const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as keyof CliArgs;
      if (key === 'skipLlm' || key === 'skipAudit') {
        (out[key] as boolean) = value === 'true';
      } else {
        (out[key] as string) = value;
      }
    } else if (arg === '--skip-llm') {
      out.skipLlm = true;
    } else if (arg === '--skip-audit') {
      out.skipAudit = true;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.week || !args.baseline) {
    console.error(
      'Usage: pipeline:weekly --week=2026-W17 --baseline=2026-Q2 [--sources=id1,id2,...] [--skip-llm] [--skip-audit]',
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
    ...(args.skipAudit ? { skipAudit: true } : {}),
  };

  console.log(`▶ running weekly pipeline for ${args.week} (baseline ${args.baseline})`);
  const result = await runWeekly(opts);

  console.log('');
  console.log(`fetched:        ${result.fetched} articles`);
  console.log(`pre-filtered:   ${result.preFiltered} kept`);
  console.log(
    `classified:     ${result.classified} valid events (${result.invalidEvents} dropped at validation)`,
  );
  if (result.cappedEvents.length > 0) {
    console.log(`severity cap:   ${result.cappedEvents.length} events downgraded`);
    for (const c of result.cappedEvents) {
      console.log(`  ${c.id}: ${c.from} → ${c.to} (${c.outletCount} outlets)`);
    }
  }
  if (result.audit) {
    const counts = result.audit.per_event.reduce<Record<string, number>>((acc, v) => {
      acc[v.verdict] = (acc[v.verdict] ?? 0) + 1;
      return acc;
    }, {});
    console.log(
      `audit:          pass=${counts['pass'] ?? 0} flag=${counts['flag'] ?? 0} downgrade=${counts['downgrade'] ?? 0}`,
    );
  }
  if (result.anomalies.length > 0) {
    console.log(`anomalies:      ${result.anomalies.length}`);
    for (const a of result.anomalies) {
      console.log(`  [${a.level}] ${a.trigger}: ${a.details}`);
    }
  }
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
  if (result.outputs.reportPath) console.log(`wrote ${result.outputs.reportPath}`);

  if (args.emitAnomaliesJson) {
    await writeFile(
      args.emitAnomaliesJson,
      JSON.stringify(result.anomalies, null, 2),
      'utf-8',
    );
    console.log(`wrote ${args.emitAnomaliesJson} (${result.anomalies.length} anomalies)`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
}
