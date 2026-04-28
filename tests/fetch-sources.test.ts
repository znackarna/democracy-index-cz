import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchAllSources, loadSources } from '../src/pipeline/fetch-sources';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_FEED = path.join(__dirname, 'fixtures', 'sample-feed.xml');

function writeTempConfig(yamlText: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'sources-test-'));
  const file = path.join(dir, 'sources.yaml');
  writeFileSync(file, yamlText, 'utf-8');
  return file;
}

describe('loadSources', () => {
  it('parses and validates the YAML', async () => {
    const config = writeTempConfig(`
version: 1
sources:
  - id: test-rss
    name: Test RSS
    category: czech_media
    type: rss
    url: https://example.test/feed
`);
    const sources = await loadSources(config);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.id).toBe('test-rss');
  });

  it('rejects malformed config', async () => {
    const config = writeTempConfig(`version: 1\nsources: []`);
    await expect(loadSources(config)).rejects.toThrow();
  });
});

describe('fetchAllSources', () => {
  it('fetches all RSS sources, dedupes, and skips non-rss types by default', async () => {
    const config = writeTempConfig(`
version: 1
sources:
  - id: rss-a
    name: Outlet A
    category: czech_media
    type: rss
    url: https://a.test/feed
  - id: rss-b
    name: Outlet B
    category: czech_media
    type: rss
    url: https://b.test/feed
  - id: html-c
    name: HTML Source
    category: open_data
    type: html
    url: https://c.test/page
`);
    const sampleXml = await readFile(SAMPLE_FEED, 'utf-8');
    const result = await fetchAllSources({
      configPath: config,
      fetchText: async () => sampleXml,
    });

    // Sample feed has 4 items but article 1 is duplicated → 3 unique per outlet.
    // Two RSS outlets fetch the same XML → all 6 articles share URLs → dedupe to 3.
    expect(result.articles).toHaveLength(3);
    const perRss = result.perSource.filter((p) => p.type === 'rss');
    expect(perRss).toHaveLength(2);
    expect(perRss.every((p) => p.count === 4)).toBe(true);
    const perHtml = result.perSource.find((p) => p.id === 'html-c');
    expect(perHtml?.error).toMatch(/skipped/);
  });

  it('captures per-source errors without aborting the whole run', async () => {
    const config = writeTempConfig(`
version: 1
sources:
  - id: ok
    name: Working
    category: czech_media
    type: rss
    url: https://ok.test/feed
  - id: bad
    name: Broken
    category: czech_media
    type: rss
    url: https://bad.test/feed
`);
    const sampleXml = await readFile(SAMPLE_FEED, 'utf-8');
    const result = await fetchAllSources({
      configPath: config,
      fetchText: async (url: string) => {
        if (url.includes('bad.test')) throw new Error('connection refused');
        return sampleXml;
      },
    });
    expect(result.articles.length).toBeGreaterThan(0);
    const okEntry = result.perSource.find((p) => p.id === 'ok');
    const badEntry = result.perSource.find((p) => p.id === 'bad');
    expect(okEntry?.error).toBeUndefined();
    expect(badEntry?.error).toMatch(/connection refused/);
  });
});
