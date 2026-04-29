import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { preFilter } from '../src/pipeline/pre-filter';
import type { RawArticle } from '../src/lib/types';

function mockClient(jsonResponse: unknown): Anthropic {
  const parse = vi.fn(async () => ({
    content: [{ type: 'text', text: JSON.stringify(jsonResponse) }],
    parsed_output: jsonResponse,
  }));
  return { messages: { parse } } as unknown as Anthropic;
}

const FETCHED_AT = '2026-04-23T08:00:00.000Z';

const articles: RawArticle[] = [
  {
    url: 'https://example.test/relevant',
    title: 'Vláda schválila novelu zákona o ÚS',
    outlet: 'Test Outlet',
    fetched_at: FETCHED_AT,
    summary: 'Vláda schválila kontroverzní novelu.',
  },
  {
    url: 'https://example.test/sport',
    title: 'Sparta vyhrála derby',
    outlet: 'Test Outlet',
    fetched_at: FETCHED_AT,
  },
];

describe('preFilter', () => {
  it('returns empty array when input is empty', async () => {
    const result = await preFilter([], { client: mockClient({ decisions: [] }), prompt: 'x' });
    expect(result).toEqual([]);
  });

  it('keeps only articles the model marked keep:true and merges metadata', async () => {
    const client = mockClient({
      decisions: [
        { index: 0, keep: true, reason: 'Concerns judicial independence', candidate_pillar: 'judicial' },
        { index: 1, keep: false, reason: 'Pure sports' },
      ],
    });
    const result = await preFilter(articles, { client, prompt: 'pre-filter prompt body' });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      url: 'https://example.test/relevant',
      candidate_pillar: 'judicial',
      reason_kept: 'Concerns judicial independence',
    });
  });

  it('coerces unknown candidate_pillar values to null', async () => {
    const client = mockClient({
      decisions: [
        { index: 0, keep: true, reason: 'kept', candidate_pillar: 'not-a-real-pillar' },
        { index: 1, keep: false, reason: 'dropped' },
      ],
    });
    const result = await preFilter(articles, { client, prompt: 'x' });
    expect(result[0]?.candidate_pillar).toBeNull();
  });

  it('skips decisions whose index is out of range', async () => {
    const client = mockClient({
      decisions: [
        { index: 0, keep: true, reason: 'kept' },
        { index: 99, keep: true, reason: 'phantom' }, // ← no article at this index
      ],
    });
    const result = await preFilter(articles, { client, prompt: 'x' });
    expect(result).toHaveLength(1);
  });

  it('propagates SDK parse failure when the model returns invalid JSON twice', async () => {
    const parse = vi.fn(() => {
      throw new Error('Failed to parse structured output: unexpected token');
    });
    const client = { messages: { parse } } as unknown as Anthropic;
    await expect(preFilter(articles, { client, prompt: 'x' })).rejects.toThrow(
      /Failed to parse structured output/,
    );
    // callClaudeJson retries once on SDK parse failures (1 + 1 retry = 2 calls).
    expect(parse).toHaveBeenCalledTimes(2);
  });
});
