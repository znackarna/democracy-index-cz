import type Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callClaudeJson, SONNET_MODEL } from '../lib/claude';
import { type Event } from '../lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

export type Verdict = 'pass' | 'flag' | 'downgrade';

export interface PerEventVerdict {
  event_id: string;
  verdict: Verdict;
  note: string;
}

export interface AggregateAssessment {
  direction_asymmetry: string;
  outlet_concentration: string;
  pillar_distribution: string;
  overall_assessment: string;
}

export interface AuditResult {
  per_event: PerEventVerdict[];
  aggregate: AggregateAssessment;
}

export interface AuditOptions {
  client?: Anthropic;
  /** Override the auditor prompt — used in tests. */
  auditorPrompt?: string;
  /** Override the pillars context — used in tests. */
  pillarsContext?: string;
  /** Override the rubric context — used in tests. */
  rubricContext?: string;
}

const AUDIT_SCHEMA = {
  type: 'object',
  required: ['per_event', 'aggregate'],
  additionalProperties: false,
  properties: {
    per_event: {
      type: 'array',
      items: {
        type: 'object',
        required: ['event_id', 'verdict', 'note'],
        additionalProperties: false,
        properties: {
          event_id: { type: 'string' },
          verdict: { type: 'string', enum: ['pass', 'flag', 'downgrade'] },
          note: { type: 'string' },
        },
      },
    },
    aggregate: {
      type: 'object',
      required: [
        'direction_asymmetry',
        'outlet_concentration',
        'pillar_distribution',
        'overall_assessment',
      ],
      additionalProperties: false,
      properties: {
        direction_asymmetry: { type: 'string' },
        outlet_concentration: { type: 'string' },
        pillar_distribution: { type: 'string' },
        overall_assessment: { type: 'string' },
      },
    },
  },
} as const;

export async function auditEvents(
  events: readonly Event[],
  options: AuditOptions = {},
): Promise<AuditResult> {
  if (events.length === 0) {
    return {
      per_event: [],
      aggregate: {
        direction_asymmetry: 'No events to audit.',
        outlet_concentration: 'No events to audit.',
        pillar_distribution: 'No events to audit.',
        overall_assessment: 'No events this week.',
      },
    };
  }

  const [auditorPrompt, pillarsContext, rubricContext] = await Promise.all([
    options.auditorPrompt
      ? Promise.resolve(options.auditorPrompt)
      : readFile(path.join(PROJECT_ROOT, 'prompts', 'audit.md'), 'utf-8'),
    options.pillarsContext
      ? Promise.resolve(options.pillarsContext)
      : readFile(path.join(PROJECT_ROOT, 'methodology', 'pillars.md'), 'utf-8'),
    options.rubricContext
      ? Promise.resolve(options.rubricContext)
      : readFile(path.join(PROJECT_ROOT, 'methodology', 'severity_rubric.md'), 'utf-8'),
  ]);

  const userBody = renderUserMessage(events);

  const result = await callClaudeJson<AuditResult>({
    ...(options.client !== undefined ? { client: options.client } : {}),
    model: SONNET_MODEL,
    system: [
      { text: pillarsContext, cache: true },
      { text: rubricContext, cache: true },
      { text: auditorPrompt, cache: true },
    ],
    user: userBody,
    schema: AUDIT_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 8000,
    parse: (raw) => raw as AuditResult,
  });

  return result;
}

/**
 * Apply auditor verdicts to the events list:
 * - `pass` → unchanged
 * - `flag` → append auditor note to rationale; status unchanged
 * - `downgrade` → append note + set status to `needs_review`
 *
 * Severity, direction, pillar are NEVER overwritten by the auditor — only
 * status and rationale (which adds an auditor block).
 */
export function applyAuditVerdicts(
  events: readonly Event[],
  result: AuditResult,
): Event[] {
  const verdictById = new Map(result.per_event.map((v) => [v.event_id, v]));
  return events.map((e) => {
    const v = verdictById.get(e.id);
    if (!v || v.verdict === 'pass') return e;
    const updated: Event = {
      ...e,
      rationale: `${e.rationale}\n\n[auditor: ${v.verdict}] ${v.note}`,
    };
    if (v.verdict === 'downgrade' && updated.status === 'active') {
      updated.status = 'needs_review';
    }
    return updated;
  });
}

function renderUserMessage(events: readonly Event[]): string {
  const lines = ['Events to audit (return per_event verdict for each + one aggregate object):', ''];
  for (const e of events) {
    lines.push(`### ${e.id}`);
    lines.push(`- date: ${e.date}`);
    lines.push(`- pillar: ${e.pillar}`);
    lines.push(`- severity: ${e.severity ?? 'null'}`);
    lines.push(`- direction: ${e.direction}`);
    lines.push(`- duration: ${e.duration}`);
    lines.push(`- status: ${e.status}`);
    lines.push(`- score_impact: ${e.score_impact}`);
    lines.push(`- sources: ${e.sources.map((s) => s.outlet).join(', ')} (${e.sources.length} total)`);
    lines.push(`- headline: ${e.headline}`);
    lines.push(`- summary: ${e.summary}`);
    lines.push(`- rationale: ${e.rationale}`);
    lines.push('');
  }
  return lines.join('\n');
}
