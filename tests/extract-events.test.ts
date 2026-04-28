import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import {
  computeScoreImpact,
  extractEvents,
  makeEventId,
} from '../src/pipeline/extract-events';
import { getValidator } from '../src/pipeline/validate';
import type { PreFilteredArticle } from '../src/lib/types';

function mockClient(jsonResponse: unknown): Anthropic {
  const create = vi.fn(async () => ({
    content: [{ type: 'text', text: JSON.stringify(jsonResponse) }],
  }));
  return { messages: { create } } as unknown as Anthropic;
}

const FETCHED_AT = '2026-04-23T08:00:00.000Z';
const FIXED_NOW = new Date('2026-04-23T10:00:00.000Z');

const baseArticles: PreFilteredArticle[] = [
  {
    url: 'https://example.test/article/1',
    title: 'Vláda schválila novelu zákona o ÚS',
    outlet: 'Test Outlet',
    fetched_at: FETCHED_AT,
    summary: 'Vláda dnes schválila novelu zákona o ústavním soudu.',
    candidate_pillar: 'judicial',
    reason_kept: 'Týká se nezávislosti ÚS',
  },
];

const STUB_CONTEXT = {
  classificationPrompt: 'classification stub',
  pillarsContext: 'pillars stub',
  rubricContext: 'rubric stub',
};

describe('computeScoreImpact', () => {
  it('multiplies severity magnitude by direction', () => {
    expect(computeScoreImpact(1, -1)).toBeCloseTo(-0.2, 5);
    expect(computeScoreImpact(2, 1)).toBeCloseTo(0.5, 5);
    expect(computeScoreImpact(3, -1)).toBeCloseTo(-1.5, 5);
    expect(computeScoreImpact(4, 1)).toBeCloseTo(3.0, 5);
    expect(computeScoreImpact(5, -1)).toBeCloseTo(-6.0, 5);
  });

  it('returns 0 when direction is 0 or severity is null', () => {
    expect(computeScoreImpact(4, 0)).toBe(0);
    expect(computeScoreImpact(null, -1)).toBe(0);
  });
});

describe('makeEventId', () => {
  it('formats with three-digit zero-padded sequence', () => {
    expect(makeEventId('2026-W17', 1)).toBe('2026-W17-001');
    expect(makeEventId('2026-W01', 42)).toBe('2026-W01-042');
    expect(makeEventId('2026-W52', 999)).toBe('2026-W52-999');
  });

  it('rejects out-of-range sequences', () => {
    expect(() => makeEventId('2026-W17', 0)).toThrow();
    expect(() => makeEventId('2026-W17', 1000)).toThrow();
  });
});

describe('extractEvents', () => {
  it('returns empty when input is empty', async () => {
    const events = await extractEvents([], {
      ...STUB_CONTEXT,
      week: '2026-W17',
      client: mockClient({ extractions: [] }),
    });
    expect(events).toEqual([]);
  });

  it('assembles a fully-formed event from a model extraction', async () => {
    const client = mockClient({
      extractions: [
        {
          index: 0,
          is_event: true,
          date: '2026-04-22',
          headline: 'Vláda schválila novelu zákona o ÚS ve zkráceném čtení',
          summary:
            'Vláda dnes schválila kontroverzní novelu zákona o ústavním soudu ve zkráceném čtení bez připomínkového řízení.',
          pillar: 'judicial',
          severity: 4,
          direction: -1,
          duration: 'one_off',
          rationale:
            'Severity 4 per rubric §4 — porušení procesu (zkrácené čtení) na zákonu měnícím nezávislost ÚS.',
        },
      ],
    });
    const [event] = await extractEvents(baseArticles, {
      ...STUB_CONTEXT,
      week: '2026-W17',
      client,
      now: FIXED_NOW,
    });
    expect(event).toBeDefined();
    expect(event!).toMatchObject({
      id: '2026-W17-001',
      pillar: 'judicial',
      severity: 4,
      direction: -1,
      score_impact: -3,
      reviewer: 'auto',
      status: 'active',
      created_at: FIXED_NOW.toISOString(),
    });
    expect(event!.sources[0]?.url).toBe(baseArticles[0]!.url);
    expect(event!.expires_at).toBeDefined();
    // 2026-04-22 + 12 weeks = 2026-07-15
    expect(event!.expires_at?.startsWith('2026-07-15')).toBe(true);
  });

  it('marks events with severity null as needs_review and zero impact', async () => {
    const client = mockClient({
      extractions: [
        {
          index: 0,
          is_event: true,
          date: '2026-04-22',
          headline: 'Sporná událost',
          summary: 'Něco se stalo, ale není jasné, jak to klasifikovat institucionálně.',
          pillar: 'governance',
          severity: null,
          direction: 0,
          duration: 'one_off',
          rationale:
            'Severity null per rubric — zdroje se rozcházejí, potřeba lidský review pro kalibraci.',
        },
      ],
    });
    const [event] = await extractEvents(baseArticles, {
      ...STUB_CONTEXT,
      week: '2026-W17',
      client,
      now: FIXED_NOW,
    });
    expect(event!.status).toBe('needs_review');
    expect(event!.score_impact).toBe(0);
    expect(event!.severity).toBeNull();
  });

  it('skips extractions with is_event=false', async () => {
    const articles: PreFilteredArticle[] = [
      baseArticles[0]!,
      { ...baseArticles[0]!, url: 'https://example.test/other', title: 'Other' },
    ];
    const client = mockClient({
      extractions: [
        {
          index: 0,
          is_event: true,
          date: '2026-04-22',
          headline: 'Reálná událost',
          summary: 'Konkrétní událost s institucionálním dopadem za poslední den.',
          pillar: 'judicial',
          severity: 3,
          direction: -1,
          duration: 'one_off',
          rationale: 'Severity 3 per rubric §3 — broad consequences, sets precedent.',
        },
        { index: 1, is_event: false, drop_reason: 'Opinion piece, no concrete event' },
      ],
    });
    const events = await extractEvents(articles, {
      ...STUB_CONTEXT,
      week: '2026-W17',
      client,
      now: FIXED_NOW,
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.id).toBe('2026-W17-001');
  });

  it('omits expires_at for persistent events', async () => {
    const client = mockClient({
      extractions: [
        {
          index: 0,
          is_event: true,
          date: '2026-04-22',
          headline: 'Strukturální posun',
          summary: 'Trvalý institucionální posun, dokud nebude resolved.',
          pillar: 'judicial',
          severity: 5,
          direction: -1,
          duration: 'persistent',
          rationale: 'Severity 5 per rubric §5 — strukturální změna, persistent.',
        },
      ],
    });
    const [event] = await extractEvents(baseArticles, {
      ...STUB_CONTEXT,
      week: '2026-W17',
      client,
      now: FIXED_NOW,
    });
    expect(event!.expires_at).toBeUndefined();
    expect(event!.duration).toBe('persistent');
  });

  it('produces events that pass JSON-schema validation', async () => {
    const client = mockClient({
      extractions: [
        {
          index: 0,
          is_event: true,
          date: '2026-04-22',
          headline: 'Validační test',
          summary: 'Tato událost musí projít AJV validací proti event.schema.json.',
          pillar: 'judicial',
          severity: 3,
          direction: -1,
          duration: 'one_off',
          rationale: 'Severity 3 per rubric §3 — testovací rationale dostatečně dlouhé.',
        },
      ],
    });
    const [event] = await extractEvents(baseArticles, {
      ...STUB_CONTEXT,
      week: '2026-W17',
      client,
      now: FIXED_NOW,
    });
    const validator = await getValidator('event');
    const result = validator.validate(event);
    expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
    expect(result.valid).toBe(true);
  });
});
