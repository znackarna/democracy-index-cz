import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dedupeArticles, fetchRssFeed } from '../src/lib/feeds';
import type { RawArticle } from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'sample-feed.xml');

describe('fetchRssFeed', () => {
  it('parses items, attaches outlet, and preserves source URL', async () => {
    const xml = await readFile(FIXTURE, 'utf-8');
    const articles = await fetchRssFeed('https://example.test/feed', 'Test Outlet', {
      fetchText: async () => xml,
    });
    expect(articles).toHaveLength(4);
    expect(articles[0]).toMatchObject({
      url: 'https://example.test/article/1',
      title: 'Vláda schválila novelu zákona o ÚS',
      outlet: 'Test Outlet',
    });
    expect(articles[0]?.published_at).toBeDefined();
    expect(articles[0]?.summary).toContain('Vláda dnes schválila');
    expect(articles[0]?.fetched_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws when the underlying fetcher fails', async () => {
    await expect(
      fetchRssFeed('https://example.test/broken', 'Broken Outlet', {
        fetchText: async () => {
          throw new Error('connection refused');
        },
      }),
    ).rejects.toThrow(/connection refused/);
  });

  it('skips items without a link or title', async () => {
    const incomplete = `<?xml version="1.0"?><rss version="2.0"><channel>
      <title>X</title><link>https://x.test</link><description>x</description>
      <item><title>Has title but no link</title></item>
      <item><link>https://x.test/no-title</link></item>
      <item><title>Good</title><link>https://x.test/good</link></item>
    </channel></rss>`;
    const articles = await fetchRssFeed('https://x.test/feed', 'X', {
      fetchText: async () => incomplete,
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]?.url).toBe('https://x.test/good');
  });
});

describe('dedupeArticles', () => {
  it('removes duplicate URLs case-insensitively, first occurrence wins', () => {
    const a: RawArticle = {
      url: 'https://example.test/Article/1',
      title: 'A',
      outlet: 'O',
      fetched_at: '2026-04-23T08:00:00.000Z',
    };
    const b: RawArticle = {
      url: 'https://example.test/article/1',
      title: 'B',
      outlet: 'O',
      fetched_at: '2026-04-23T08:00:00.000Z',
    };
    const c: RawArticle = {
      url: 'https://example.test/article/2',
      title: 'C',
      outlet: 'O',
      fetched_at: '2026-04-23T08:00:00.000Z',
    };
    const result = dedupeArticles([a, b, c]);
    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe('A');
    expect(result[1]?.title).toBe('C');
  });
});
