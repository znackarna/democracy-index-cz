import type Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callClaudeJson, SONNET_MODEL } from '../lib/claude';
import { dedupeEvents } from './dedupe';
import {
  PILLARS,
  type Direction,
  type Event,
  type IsoWeek,
  type PreFilteredArticle,
  type Severity,
} from '../lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const DEFAULT_BATCH_SIZE = 5;

/**
 * Severity → impact magnitude per methodology/severity_rubric.md.
 * `score_impact` on the event = magnitude * direction (so a +1 direction at
 * severity 4 yields +3.0; -1 direction at severity 4 yields -3.0).
 */
const SEVERITY_MAGNITUDE: Record<Severity, number> = {
  1: 0.2,
  2: 0.5,
  3: 1.5,
  4: 3.0,
  5: 6.0,
};

const ONE_OFF_DECAY_WEEKS = 12;
const MS_PER_DAY = 86_400_000;

// Anthropic structured-outputs does not support numeric/string constraints
// (minimum, maximum, minLength, maxLength). Length and range bounds must
// live in the prompt and be re-checked in assembleEvent. Severity is
// constrained via `enum` instead of minimum/maximum.
const EXTRACTION_SCHEMA = {
  type: 'object',
  required: ['extractions'],
  additionalProperties: false,
  properties: {
    extractions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['index', 'is_event'],
        additionalProperties: false,
        properties: {
          index: { type: 'integer' },
          is_event: { type: 'boolean' },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          headline: { type: 'string' },
          summary: { type: 'string' },
          pillar: { type: 'string', enum: [...PILLARS] },
          severity: {
            anyOf: [{ type: 'integer', enum: [1, 2, 3, 4, 5] }, { type: 'null' }],
          },
          direction: { type: 'integer', enum: [-1, 0, 1] },
          duration: { type: 'string', enum: ['one_off', 'persistent'] },
          rationale: { type: 'string' },
          drop_reason: { type: 'string' },
        },
      },
    },
  },
} as const;

interface ExtractionResult {
  index: number;
  is_event: boolean;
  date?: string;
  headline?: string;
  summary?: string;
  pillar?: string;
  severity?: number | null;
  direction?: number;
  duration?: string;
  rationale?: string;
  drop_reason?: string;
}

export interface ExtractOptions {
  client?: Anthropic;
  batchSize?: number;
  /** Override the classification prompt — used in tests. */
  classificationPrompt?: string;
  /** Override the pillars methodology context — used in tests. */
  pillarsContext?: string;
  /** Override the rubric methodology context — used in tests. */
  rubricContext?: string;
  /** ISO week the run is for; used to build event IDs and resolve `now` if absent. */
  week: IsoWeek;
  /** For deterministic timestamps in tests. */
  now?: Date;
  /** Starting sequence number for event IDs (default 1). */
  startSeq?: number;
  /** Disable post-classification dedupe — used in tests for clarity. */
  skipDedupe?: boolean;
}

export async function extractEvents(
  articles: readonly PreFilteredArticle[],
  options: ExtractOptions,
): Promise<Event[]> {
  if (articles.length === 0) return [];

  const [classificationPrompt, pillarsContext, rubricContext] = await Promise.all([
    options.classificationPrompt
      ? Promise.resolve(options.classificationPrompt)
      : readFile(path.join(PROJECT_ROOT, 'prompts', 'classification.md'), 'utf-8'),
    options.pillarsContext
      ? Promise.resolve(options.pillarsContext)
      : readFile(path.join(PROJECT_ROOT, 'methodology', 'pillars.md'), 'utf-8'),
    options.rubricContext
      ? Promise.resolve(options.rubricContext)
      : readFile(path.join(PROJECT_ROOT, 'methodology', 'severity_rubric.md'), 'utf-8'),
  ]);

  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const now = options.now ?? new Date();
  let seq = options.startSeq ?? 1;
  const events: Event[] = [];

  for (let start = 0; start < articles.length; start += batchSize) {
    const batch = articles.slice(start, start + batchSize);
    // Per-batch try/catch — Sonnet občas vrátí malformed JSON pro konkrétní
    // batch articles a obě retry attempts selžou (deterministický bug, ne
    // transient). Bez tohoto chytání jeden zlomený batch zabije celé volání
    // extractEvents — všechny ostatní úspěšné batche v tom samém runu zahodí.
    // Cena: ~5-15 article z toho batch zmizí. Daily run je má šanci pokud
    // článek zůstane v RSS retenci přes URL-dedupe v dalším runu (typicky až
    // se zformuluje jiný náhodný batching), nebo do týdne propadne navždy.
    let extractions: ExtractionResult[];
    try {
      extractions = await classifyBatch(
        batch,
        classificationPrompt,
        pillarsContext,
        rubricContext,
        options.week,
        now,
        options.client,
      );
    } catch (err) {
      console.warn(
        `  ✗ classify batch ${start}-${start + batch.length} FAILED, skipping: ${(err as Error).message.slice(0, 200)}`,
      );
      continue;
    }
    for (const e of extractions) {
      if (!e.is_event) continue;
      const article = batch[e.index];
      if (!article) continue;
      const event = assembleEvent(article, e, options.week, now, seq);
      if (event) {
        events.push(event);
        seq += 1;
      }
    }
  }
  if (options.skipDedupe) return events;
  return dedupeEvents(events).events;
}

async function classifyBatch(
  batch: readonly PreFilteredArticle[],
  classificationPrompt: string,
  pillarsContext: string,
  rubricContext: string,
  week: IsoWeek,
  now: Date,
  client?: Anthropic,
): Promise<ExtractionResult[]> {
  const userBody = renderUserMessage(batch, week, now);
  // Stable, large methodology context first (cached), then per-batch instructions.
  // This keeps the prompt-cache prefix invariant across the whole weekly run.
  const result = await callClaudeJson<{ extractions: ExtractionResult[] }>({
    ...(client !== undefined ? { client } : {}),
    model: SONNET_MODEL,
    system: [
      { text: pillarsContext, cache: true },
      { text: rubricContext, cache: true },
      { text: classificationPrompt, cache: true },
    ],
    user: userBody,
    schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 8000,
    parse: (raw) => raw as { extractions: ExtractionResult[] },
  });
  return result.extractions;
}

function renderUserMessage(
  batch: readonly PreFilteredArticle[],
  week: IsoWeek,
  now: Date,
): string {
  const today = now.toISOString().slice(0, 10);
  const lines = [
    `Today: ${today}`,
    `Reference week: ${week} (the week being processed; events are usually within ±14 days of today).`,
    '',
    'Articles to classify (return one extraction per index):',
    '',
  ];
  batch.forEach((a, idx) => {
    lines.push(`[${idx}] ${a.outlet} — ${a.title}`);
    if (a.published_at) lines.push(`    Published: ${a.published_at.slice(0, 10)}`);
    if (a.summary) lines.push(`    Summary: ${truncate(a.summary, 600)}`);
    lines.push(`    URL: ${a.url}`);
    if (a.candidate_pillar) lines.push(`    Pre-filter pillar guess: ${a.candidate_pillar}`);
    lines.push(`    Pre-filter reason: ${a.reason_kept}`);
    lines.push('');
  });
  return lines.join('\n');
}

function assembleEvent(
  article: PreFilteredArticle,
  e: ExtractionResult,
  week: IsoWeek,
  now: Date,
  seq: number,
): Event | null {
  if (!e.date || !e.headline || !e.summary || !e.pillar || !e.duration || !e.rationale) {
    return null;
  }
  if (e.direction !== -1 && e.direction !== 0 && e.direction !== 1) return null;
  if (!(PILLARS as readonly string[]).includes(e.pillar)) return null;
  if (e.duration !== 'one_off' && e.duration !== 'persistent') return null;

  const severity = normalizeSeverity(e.severity);
  const direction = e.direction as Direction;
  const score_impact = computeScoreImpact(severity, direction);
  const status = severity === null ? 'needs_review' : 'active';
  const id = makeEventId(week, seq);
  const isoNow = now.toISOString();

  const event: Event = {
    id,
    date: e.date,
    headline: e.headline,
    summary: e.summary,
    pillar: e.pillar as Event['pillar'],
    severity,
    direction,
    duration: e.duration,
    sources: [
      {
        title: article.title,
        url: article.url,
        outlet: article.outlet,
        fetched_at: article.fetched_at,
      },
    ],
    score_impact,
    rationale: e.rationale,
    reviewer: 'auto',
    status,
    created_at: isoNow,
  };

  if (e.duration === 'one_off') {
    event.expires_at = computeExpiresAt(e.date).toISOString();
  }
  return event;
}

export function computeScoreImpact(severity: Severity | null, direction: Direction): number {
  if (severity === null) return 0;
  return SEVERITY_MAGNITUDE[severity] * direction;
}

export function makeEventId(week: IsoWeek, seq: number): string {
  if (seq < 1 || seq > 999) throw new Error(`Event sequence out of range: ${seq}`);
  return `${week}-${String(seq).padStart(3, '0')}`;
}

function computeExpiresAt(eventDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  if (!m) throw new Error(`Invalid event date for expires_at: ${eventDate}`);
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(base + ONE_OFF_DECAY_WEEKS * 7 * MS_PER_DAY);
}

function normalizeSeverity(s: number | null | undefined): Severity | null {
  if (s === null || s === undefined) return null;
  if (s === 1 || s === 2 || s === 3 || s === 4 || s === 5) return s;
  return null;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
