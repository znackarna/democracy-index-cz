import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateMonthlySpotcheck } from '../src/pipeline/monthly-spotcheck';
import type { Event } from '../src/lib/types';

function setupRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'spotcheck-test-'));
  mkdirSync(path.join(root, 'data', 'events'), { recursive: true });
  return root;
}

function event(id: string, date: string, headline = 'Test event'): Event {
  return {
    id,
    date,
    headline,
    summary: 'Twenty-character minimum summary text for the schema requirement.',
    pillar: 'judicial',
    severity: 3,
    direction: -1,
    duration: 'one_off',
    sources: [
      { title: 's', url: `https://o.test/${id}`, outlet: 'Outlet', fetched_at: '2026-04-23T08:00:00.000Z' },
    ],
    score_impact: -1.5,
    rationale: 'Severity 3 per rubric §3 — sufficient text to satisfy schema validation.',
    reviewer: 'auto',
    status: 'active',
    created_at: '2026-04-23T08:00:00.000Z',
  };
}

describe('generateMonthlySpotcheck', () => {
  it('throws on invalid month format', async () => {
    await expect(generateMonthlySpotcheck({ month: 'badmonth' })).rejects.toThrow(/Invalid month/);
    await expect(generateMonthlySpotcheck({ month: '2026-4' })).rejects.toThrow(/Invalid month/);
  });

  it('returns empty sample when month has no events', async () => {
    const root = setupRoot();
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W17.json'),
      JSON.stringify([event('2026-W17-001', '2026-04-22')]),
    );
    const result = await generateMonthlySpotcheck({ month: '2026-03', projectRoot: root });
    expect(result.totalEvents).toBe(0);
    expect(result.sampled).toEqual([]);
    expect(result.issueBody).toContain('Žádné events');
  });

  it('filters events by month from event.date (not file name)', async () => {
    const root = setupRoot();
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W17.json'),
      JSON.stringify([
        event('a', '2026-04-22'),
        event('b', '2026-03-30'), // March, not April
        event('c', '2026-04-26'),
      ]),
    );
    const result = await generateMonthlySpotcheck({ month: '2026-04', projectRoot: root });
    expect(result.totalEvents).toBe(2);
    expect(result.sampled.map((e) => e.id).sort()).toEqual(['a', 'c']);
  });

  it('samples deterministically by month seed', async () => {
    const root = setupRoot();
    const events = Array.from({ length: 20 }, (_, i) =>
      event(`e${String(i).padStart(2, '0')}`, '2026-04-22'),
    );
    writeFileSync(path.join(root, 'data', 'events', '2026-W17.json'), JSON.stringify(events));

    const a = await generateMonthlySpotcheck({ month: '2026-04', projectRoot: root, sampleSize: 5 });
    const b = await generateMonthlySpotcheck({ month: '2026-04', projectRoot: root, sampleSize: 5 });
    const c = await generateMonthlySpotcheck({ month: '2026-05', projectRoot: root, sampleSize: 5 });

    expect(a.sampled.map((e) => e.id)).toEqual(b.sampled.map((e) => e.id));
    // Different month → different sample (with high probability across 20 events)
    expect(a.sampled.map((e) => e.id)).not.toEqual(c.sampled.map((e) => e.id));
  });

  it('caps sample to total when totalEvents < sampleSize', async () => {
    const root = setupRoot();
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W17.json'),
      JSON.stringify([event('a', '2026-04-22'), event('b', '2026-04-23')]),
    );
    const result = await generateMonthlySpotcheck({ month: '2026-04', projectRoot: root, sampleSize: 10 });
    expect(result.sampled).toHaveLength(2);
  });

  it('renders issue body with checkboxes per sampled event', async () => {
    const root = setupRoot();
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W17.json'),
      JSON.stringify([event('2026-W17-001', '2026-04-22', 'My headline')]),
    );
    const result = await generateMonthlySpotcheck({ month: '2026-04', projectRoot: root });
    expect(result.issueBody).toContain('## 1. 2026-W17-001 — My headline');
    expect(result.issueBody).toContain('- [ ] Souhlasím s klasifikací');
    expect(result.issueBody).toContain('- [ ] Nesouhlasím (popiš v komentáři)');
    expect(result.issueBody).toContain('Měsíc: **2026-04**');
  });
});
