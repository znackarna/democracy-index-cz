import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { recomputeScores } from '../src/pipeline/recompute-scores';
import type { Event, ScoreSnapshot, StructuralBaseline } from '../src/lib/types';

function setupRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'recompute-test-'));
  mkdirSync(path.join(root, 'data', 'events'), { recursive: true });
  mkdirSync(path.join(root, 'data', 'scores'), { recursive: true });
  mkdirSync(path.join(root, 'data', 'structural'), { recursive: true });

  const baseline: StructuralBaseline = {
    quarter: '2026-Q2',
    computed_at: '2026-04-01T00:00:00.000Z',
    pillars: { electoral: 80, governance: 70, judicial: 75, media: 70, civil: 78, corruption: 65 },
    sources: [{ index: 'V-Dem', year: 2024, value: 0.8, url: 'https://v-dem.net/' }],
  };
  writeFileSync(
    path.join(root, 'data', 'structural', '2026-Q2.json'),
    JSON.stringify(baseline),
  );
  return root;
}

function event(id: string, week: string, overrides: Partial<Event> = {}): Event {
  return {
    id,
    date: '2026-04-22',
    headline: 'h',
    summary: 'Twenty-character minimum summary text for the schema requirement.',
    pillar: 'governance',
    severity: 3,
    direction: -1,
    duration: 'persistent',
    sources: [
      { title: 's', url: `https://o.test/${id}`, outlet: 'Outlet', fetched_at: '2026-04-23T08:00:00.000Z' },
    ],
    score_impact: -1.5,
    rationale: 'Severity 3 per rubric §3 — sufficient text to satisfy schema validation.',
    reviewer: 'auto',
    status: 'active',
    created_at: '2026-04-23T08:00:00.000Z',
    ...overrides,
  };
  void week;
}

describe('recomputeScores', () => {
  it('writes empty timeline when no events files exist', async () => {
    const root = setupRoot();
    const result = await recomputeScores({ baselineQuarter: '2026-Q2', projectRoot: root });
    expect(result.weeksProcessed).toBe(0);
    expect(result.snapshots).toEqual([]);
    const written = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written).toEqual([]);
  });

  it('produces one snapshot per weekly events file', async () => {
    const root = setupRoot();
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W17.json'),
      JSON.stringify([event('2026-W17-001', '2026-W17')]),
    );
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W18.json'),
      JSON.stringify([]),
    );
    const result = await recomputeScores({ baselineQuarter: '2026-Q2', projectRoot: root });
    expect(result.weeksProcessed).toBe(2);
    expect(result.snapshots.map((s) => s.week)).toEqual(['2026-W17', '2026-W18']);
    // Both snapshots should have the persistent event applied (it has status:active, persistent)
    expect(result.snapshots[0]?.pillars.governance).toBe(68.5); // 70 - 1.5
    expect(result.snapshots[1]?.pillars.governance).toBe(68.5); // persistent → still applies
  });

  it('produces sorted timeline week-ascending', async () => {
    const root = setupRoot();
    // Write in reverse order
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W18.json'),
      JSON.stringify([]),
    );
    writeFileSync(
      path.join(root, 'data', 'events', '2026-W17.json'),
      JSON.stringify([]),
    );
    const result = await recomputeScores({ baselineQuarter: '2026-Q2', projectRoot: root });
    expect(result.snapshots.map((s) => s.week)).toEqual(['2026-W17', '2026-W18']);
    const written: ScoreSnapshot[] = JSON.parse(readFileSync(result.outputPath, 'utf-8'));
    expect(written.map((s) => s.week)).toEqual(['2026-W17', '2026-W18']);
  });

  it('throws if baseline file missing', async () => {
    const root = setupRoot();
    await expect(
      recomputeScores({ baselineQuarter: '2026-Q9', projectRoot: root }),
    ).rejects.toThrow();
  });
});
