import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeDailyReport } from '../src/pipeline/report';
import type { Event, ScoreSnapshot } from '../src/lib/types';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  const base: Event = {
    id: overrides.id,
    date: '2026-04-22',
    headline: 'Vláda schválila novelu zákona o ÚS',
    summary: 'Twenty-character minimum summary text for the schema requirement and report.',
    pillar: 'judicial',
    severity: 3,
    direction: -1,
    duration: 'one_off',
    sources: [
      { title: 's', url: 'https://o.test/x', outlet: 'Outlet', fetched_at: '2026-04-23T08:00:00.000Z' },
    ],
    score_impact: -1.5,
    rationale: 'Severity 3 per rubric §3 — sufficient text to satisfy schema validation.',
    reviewer: 'auto',
    status: 'active',
    created_at: '2026-04-23T08:00:00.000Z',
  };
  return { ...base, ...overrides };
}

const newSnapshot: ScoreSnapshot = {
  week: '2026-W17',
  computed_at: '2026-04-28T08:00:00.000Z',
  overall_score: 83.1,
  pillars: { electoral: 91.8, governance: 78.3, judicial: 84.6, media: 90.5, civil: 97.1, corruption: 57.5 },
  active_events_count: 13,
  structural_baseline: '2026-Q2',
};

describe('writeDailyReport', () => {
  it('creates data/reports/YYYY-MM-DD.md with all sections populated', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'report-test-'));
    const file = await writeDailyReport(
      {
        date: new Date('2026-04-28T08:00:00.000Z'),
        week: '2026-W17',
        perSource: [{ id: 'denik-n', type: 'rss', count: 40 }, { id: 'broken', type: 'rss', count: 0, error: 'HTTP 500' }],
        fetched: 90,
        preFiltered: 28,
        events: [makeEvent({ id: '2026-W17-001' })],
        cappedEvents: [{ id: 'X', from: 4, to: 3, outletCount: 2 }],
        anomalies: [{ trigger: 'severity_5', details: 'one event has severity 5', level: 'warn' }],
        newSnapshot,
      },
      root,
    );

    expect(file).toContain('2026-04-28.md');
    const content = readFileSync(file, 'utf-8');

    expect(content).toContain('# Daily report — 2026-04-28 (week 2026-W17)');
    expect(content).toContain('## Source coverage');
    expect(content).toContain('denik-n');
    expect(content).toContain('error: HTTP 500');
    expect(content).toContain('## Pre-filter');
    expect(content).toContain('Kept: **28** of 90');
    expect(content).toContain('## Classification');
    expect(content).toContain('Final events written: **1**');
    expect(content).toContain('## Source-count → severity cap');
    expect(content).toContain('severity 4 → 3');
    expect(content).toContain('## Self-audit pass');
    expect(content).toContain('## Score change');
    expect(content).toContain('Overall (first snapshot): 83.1');
    expect(content).toContain('## Anomalies');
    expect(content).toContain('severity_5');
    expect(content).toContain('## Per-event detail');
    expect(content).toContain('### 2026-W17-001');
    expect(content).toContain('Vláda schválila');
  });

  it('shows score deltas when prevSnapshot provided', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'report-test-'));
    const prev: ScoreSnapshot = { ...newSnapshot, week: '2026-W16', overall_score: 85.0 };
    const file = await writeDailyReport(
      {
        date: new Date('2026-04-28T08:00:00.000Z'),
        week: '2026-W17',
        perSource: [],
        fetched: 0,
        preFiltered: 0,
        events: [],
        cappedEvents: [],
        anomalies: [],
        newSnapshot,
        prevSnapshot: prev,
      },
      root,
    );
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('Overall: 85.0 → 83.1 (-1.9)');
  });

  it('shows "Žádné" for empty anomaly section', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'report-test-'));
    const file = await writeDailyReport(
      {
        date: new Date('2026-04-28T08:00:00.000Z'),
        week: '2026-W17',
        perSource: [],
        fetched: 0,
        preFiltered: 0,
        events: [],
        cappedEvents: [],
        anomalies: [],
        newSnapshot,
      },
      root,
    );
    const content = readFileSync(file, 'utf-8');
    expect(content).toContain('## Anomalies\n\n_Žádné._');
  });
});
