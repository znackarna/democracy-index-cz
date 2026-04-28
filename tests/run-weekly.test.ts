import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Event, ScoreSnapshot, StructuralBaseline } from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_FEED_PATH = path.join(__dirname, 'fixtures', 'sample-feed.xml');

// Build a clean temp project root with the structure runWeekly expects.
function setupTempRoot(): { root: string; configPath: string; baseline: StructuralBaseline } {
  const root = mkdtempSync(path.join(tmpdir(), 'run-weekly-test-'));
  mkdirSync(path.join(root, 'data', 'events'), { recursive: true });
  mkdirSync(path.join(root, 'data', 'scores'), { recursive: true });
  mkdirSync(path.join(root, 'data', 'structural'), { recursive: true });
  mkdirSync(path.join(root, 'config'), { recursive: true });

  const baseline: StructuralBaseline = {
    quarter: '2026-Q2',
    computed_at: '2026-04-01T00:00:00.000Z',
    pillars: { electoral: 80, governance: 70, judicial: 75, media: 70, civil: 78, corruption: 65 },
    sources: [{ index: 'V-Dem', year: 2024, value: 0.8, url: 'https://v-dem.net/' }],
  };
  writeFileSync(
    path.join(root, 'data', 'structural', '2026-Q2.json'),
    JSON.stringify(baseline),
    'utf-8',
  );

  const sampleFeed = readFileSync(SAMPLE_FEED_PATH, 'utf-8');
  writeFileSync(path.join(root, 'sample-feed.xml'), sampleFeed, 'utf-8');

  const configPath = path.join(root, 'config', 'sources.yaml');
  writeFileSync(
    configPath,
    `version: 1
sources:
  - id: test-rss
    name: Test Outlet
    category: czech_media
    type: rss
    url: https://example.test/feed
`,
    'utf-8',
  );

  return { root, configPath, baseline };
}

const FIXED_NOW = new Date('2026-04-28T08:00:00.000Z');

describe('runWeekly — plumbing (skipLlm)', () => {
  it('writes empty events and a snapshot equal to baseline weighted average', async () => {
    const { runWeekly } = await import('../src/pipeline/run-weekly');
    const { root, configPath } = setupTempRoot();

    const result = await runWeekly({
      week: '2026-W17',
      baselineQuarter: '2026-Q2',
      projectRoot: root,
      skipLlm: true,
      now: FIXED_NOW,
      configPath,
      fetchText: async () => '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><link>https://x.test</link><description>x</description></channel></rss>',
    });

    expect(result.classified).toBe(0);
    expect(result.invalidEvents).toBe(0);
    // Baseline weighted average: same math as score.test.ts iteration 1 = 73.0
    expect(result.scoreSnapshot.overall_score).toBe(73);
    expect(result.scoreSnapshot.active_events_count).toBe(0);

    const eventsFile = JSON.parse(readFileSync(result.outputs.eventsPath, 'utf-8'));
    expect(eventsFile).toEqual([]);
    const timeline = JSON.parse(readFileSync(result.outputs.scoresPath, 'utf-8')) as ScoreSnapshot[];
    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.week).toBe('2026-W17');
  });

  it('replaces an existing snapshot for the same week instead of appending duplicates', async () => {
    const { runWeekly } = await import('../src/pipeline/run-weekly');
    const { root, configPath } = setupTempRoot();

    // First run
    await runWeekly({
      week: '2026-W17',
      baselineQuarter: '2026-Q2',
      projectRoot: root,
      skipLlm: true,
      now: FIXED_NOW,
      configPath,
      fetchText: async () => '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><link>https://x.test</link><description>x</description></channel></rss>',
    });
    // Second run for same week
    const second = await runWeekly({
      week: '2026-W17',
      baselineQuarter: '2026-Q2',
      projectRoot: root,
      skipLlm: true,
      now: new Date('2026-04-28T09:00:00.000Z'),
      configPath,
    });

    const timeline = JSON.parse(readFileSync(second.outputs.scoresPath, 'utf-8')) as ScoreSnapshot[];
    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.computed_at).toBe('2026-04-28T09:00:00.000Z');
  });

  it('keeps snapshots from other weeks while updating the current one', async () => {
    const { runWeekly } = await import('../src/pipeline/run-weekly');
    const { root, configPath } = setupTempRoot();

    // Pre-populate timeline with an older snapshot
    writeFileSync(
      path.join(root, 'data', 'scores', 'timeline.json'),
      JSON.stringify([
        {
          week: '2026-W10',
          computed_at: '2026-03-09T08:00:00.000Z',
          overall_score: 70.0,
          pillars: {
            electoral: 70,
            governance: 70,
            judicial: 70,
            media: 70,
            civil: 70,
            corruption: 70,
          },
          active_events_count: 0,
          structural_baseline: '2026-Q1',
        },
      ]),
      'utf-8',
    );

    const result = await runWeekly({
      week: '2026-W17',
      baselineQuarter: '2026-Q2',
      projectRoot: root,
      skipLlm: true,
      now: FIXED_NOW,
      configPath,
      fetchText: async () => '<?xml version="1.0"?><rss version="2.0"><channel><title>x</title><link>https://x.test</link><description>x</description></channel></rss>',
    });

    const timeline = JSON.parse(readFileSync(result.outputs.scoresPath, 'utf-8')) as ScoreSnapshot[];
    expect(timeline.map((s) => s.week)).toEqual(['2026-W10', '2026-W17']);
  });
});

describe('runWeekly — with mocked LLM', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('../src/pipeline/pre-filter');
    vi.doUnmock('../src/pipeline/extract-events');
    vi.doUnmock('../src/pipeline/fetch-sources');
  });

  it('integrates fetch → pre-filter → classify → score', async () => {
    const { root, configPath } = setupTempRoot();

    vi.doMock('../src/pipeline/fetch-sources', () => ({
      fetchAllSources: vi.fn(async () => ({
        articles: [
          {
            url: 'https://example.test/article/1',
            title: 'Test article',
            outlet: 'Test',
            fetched_at: '2026-04-23T08:00:00.000Z',
          },
        ],
        perSource: [{ id: 'test-rss', type: 'rss', count: 1 }],
      })),
    }));
    vi.doMock('../src/pipeline/pre-filter', () => ({
      preFilter: vi.fn(async (articles: { url: string }[]) =>
        articles.map((a) => ({
          ...a,
          candidate_pillar: 'judicial',
          reason_kept: 'Týká se judikatury',
        })),
      ),
    }));
    vi.doMock('../src/pipeline/extract-events', () => ({
      extractEvents: vi.fn(async (): Promise<Event[]> => [
        {
          id: '2026-W17-001',
          date: '2026-04-22',
          headline: 'Vláda schválila novelu zákona o ÚS',
          summary:
            'Vláda dnes schválila kontroverzní novelu zákona o ústavním soudu, opozice protestuje.',
          pillar: 'judicial',
          severity: 4,
          direction: -1,
          duration: 'one_off',
          sources: [
            {
              title: 'Test article',
              url: 'https://example.test/article/1',
              outlet: 'Test',
              fetched_at: '2026-04-23T08:00:00.000Z',
            },
          ],
          score_impact: -3,
          rationale:
            'Severity 4 per rubric §4 — porušení procesu na zákonu měnícím nezávislost ÚS.',
          reviewer: 'auto',
          status: 'active',
          created_at: '2026-04-28T08:00:00.000Z',
          expires_at: '2026-07-15T00:00:00.000Z',
        },
      ]),
    }));

    const { runWeekly } = await import('../src/pipeline/run-weekly');

    const result = await runWeekly({
      week: '2026-W17',
      baselineQuarter: '2026-Q2',
      projectRoot: root,
      now: FIXED_NOW,
      configPath,
    });

    expect(result.fetched).toBe(1);
    expect(result.preFiltered).toBe(1);
    expect(result.classified).toBe(1);
    expect(result.invalidEvents).toBe(0);
    // Baseline judicial = 75; one event with score_impact -3 → judicial = 72
    expect(result.scoreSnapshot.pillars.judicial).toBe(72);
    expect(result.scoreSnapshot.active_events_count).toBe(1);

    const eventsOnDisk = JSON.parse(readFileSync(result.outputs.eventsPath, 'utf-8')) as Event[];
    expect(eventsOnDisk).toHaveLength(1);
    expect(eventsOnDisk[0]?.id).toBe('2026-W17-001');
  });
});
