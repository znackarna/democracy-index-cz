import type Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callClaudeJson, HAIKU_MODEL } from '../lib/claude';
import { PILLARS, type PreFilteredArticle, type RawArticle } from '../lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.resolve(__dirname, '..', '..', 'prompts', 'event_extraction.md');

const DEFAULT_BATCH_SIZE = 25;

const PRE_FILTER_SCHEMA = {
  type: 'object',
  required: ['decisions'],
  additionalProperties: false,
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['index', 'keep', 'reason'],
        additionalProperties: false,
        properties: {
          index: { type: 'integer', minimum: 0 },
          keep: { type: 'boolean' },
          reason: { type: 'string', minLength: 1, maxLength: 300 },
          candidate_pillar: {
            anyOf: [{ type: 'string', enum: [...PILLARS] }, { type: 'null' }],
          },
        },
      },
    },
  },
} as const;

interface PreFilterDecision {
  index: number;
  keep: boolean;
  reason: string;
  candidate_pillar: string | null;
}

export interface PreFilterOptions {
  client?: Anthropic;
  batchSize?: number;
  /** Override the prompt body — used in tests. Production reads from prompts/event_extraction.md. */
  prompt?: string;
}

/**
 * Run Haiku-based relevance gate over raw articles, returning only those
 * judged relevant for the democracy index. Articles are batched to amortize
 * the per-request fixed cost; the prompt is read once.
 */
export async function preFilter(
  articles: readonly RawArticle[],
  options: PreFilterOptions = {},
): Promise<PreFilteredArticle[]> {
  if (articles.length === 0) return [];
  const prompt = options.prompt ?? (await readFile(PROMPT_PATH, 'utf-8'));
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  const kept: PreFilteredArticle[] = [];
  for (let start = 0; start < articles.length; start += batchSize) {
    const batch = articles.slice(start, start + batchSize);
    const decisions = await classifyBatch(batch, prompt, options.client);
    for (const d of decisions) {
      if (!d.keep) continue;
      const article = batch[d.index];
      if (!article) continue;
      kept.push({
        ...article,
        candidate_pillar: isPillar(d.candidate_pillar) ? d.candidate_pillar : null,
        reason_kept: d.reason,
      });
    }
  }
  return kept;
}

async function classifyBatch(
  batch: readonly RawArticle[],
  prompt: string,
  client?: Anthropic,
): Promise<PreFilterDecision[]> {
  const userBody = renderUserMessage(batch);
  const result = await callClaudeJson<{ decisions: PreFilterDecision[] }>({
    ...(client !== undefined ? { client } : {}),
    model: HAIKU_MODEL,
    system: prompt,
    user: userBody,
    schema: PRE_FILTER_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 4000,
    parse: (raw) => raw as { decisions: PreFilterDecision[] },
  });
  return result.decisions;
}

function renderUserMessage(batch: readonly RawArticle[]): string {
  const lines = ['Articles to evaluate (return one decision per index):', ''];
  batch.forEach((a, idx) => {
    lines.push(`[${idx}] ${a.outlet} — ${a.title}`);
    if (a.summary) lines.push(`    ${truncate(a.summary, 400)}`);
    lines.push(`    URL: ${a.url}`);
    lines.push('');
  });
  return lines.join('\n');
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

function isPillar(s: string | null): s is (typeof PILLARS)[number] {
  return typeof s === 'string' && (PILLARS as readonly string[]).includes(s);
}
