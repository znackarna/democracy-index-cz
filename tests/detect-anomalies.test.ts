import { describe, expect, it } from 'vitest';
import { detectAnomalies } from '../src/pipeline/detect-anomalies';
import type { Event, ScoreSnapshot } from '../src/lib/types';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  const base: Event = {
    id: overrides.id,
    date: '2026-04-22',
    headline: 'h',
    summary: 'Twenty-character minimum summary text for the schema requirement.',
    pillar: 'judicial',
    severity: 3,
    direction: -1,
    duration: 'one_off',
    sources: [
      {
        title: 's',
        url: 'https://o.test/x',
        outlet: 'Outlet',
        fetched_at: '2026-04-23T08:00:00.000Z',
      },
    ],
    score_impact: -1.5,
    rationale: 'Severity 3 per rubric §3 — sufficient text to satisfy schema validation.',
    reviewer: 'auto',
    status: 'active',
    created_at: '2026-04-23T08:00:00.000Z',
  };
  return { ...base, ...overrides };
}

const baseSnapshot: ScoreSnapshot = {
  week: '2026-W17',
  computed_at: '2026-04-28T08:00:00.000Z',
  overall_score: 80,
  pillars: { electoral: 80, governance: 70, judicial: 75, media: 70, civil: 78, corruption: 65 },
  active_events_count: 0,
  structural_baseline: '2026-Q2',
};

describe('detectAnomalies', () => {
  it('returns empty for a normal week (≤5 events, no severity 5, diverse outlets)', () => {
    const events = [
      makeEvent({ id: 'a', sources: [{ title: 'a', url: 'https://x/a', outlet: 'A', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
      makeEvent({ id: 'b', sources: [{ title: 'b', url: 'https://x/b', outlet: 'B', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
    ];
    const result = detectAnomalies({ events, newSnapshot: baseSnapshot });
    expect(result).toEqual([]);
  });

  it('flags too_many_events when count > 5', () => {
    const events = Array.from({ length: 7 }, (_, i) => makeEvent({ id: `e${i}` }));
    const result = detectAnomalies({ events, newSnapshot: baseSnapshot });
    expect(result.find((a) => a.trigger === 'too_many_events')).toBeDefined();
  });

  it('flags severity_5 if any event has severity 5', () => {
    const events = [makeEvent({ id: 'a' }), makeEvent({ id: 's5', severity: 5, score_impact: -6 })];
    const result = detectAnomalies({ events, newSnapshot: baseSnapshot });
    expect(result.find((a) => a.trigger === 'severity_5')?.details).toContain('s5');
  });

  it('flags pillar_shift when |delta| > 5 against prevSnapshot', () => {
    const prev: ScoreSnapshot = { ...baseSnapshot, week: '2026-W16', pillars: { ...baseSnapshot.pillars, governance: 70 } };
    const next: ScoreSnapshot = { ...baseSnapshot, pillars: { ...baseSnapshot.pillars, governance: 60 } };
    const result = detectAnomalies({ events: [], newSnapshot: next, prevSnapshot: prev });
    expect(result.find((a) => a.trigger === 'pillar_shift')?.details).toContain('governance');
  });

  it('does NOT flag pillar_shift for delta within ±5', () => {
    const prev: ScoreSnapshot = { ...baseSnapshot, week: '2026-W16' };
    const next: ScoreSnapshot = { ...baseSnapshot, pillars: { ...baseSnapshot.pillars, governance: 66 } };
    const result = detectAnomalies({ events: [], newSnapshot: next, prevSnapshot: prev });
    expect(result.find((a) => a.trigger === 'pillar_shift')).toBeUndefined();
  });

  it('flags auditor_high_flag_rate when ≥50 % flagged or downgraded', () => {
    const audit = {
      per_event: [
        { event_id: 'a', verdict: 'flag' as const, note: 'x' },
        { event_id: 'b', verdict: 'downgrade' as const, note: 'x' },
        { event_id: 'c', verdict: 'pass' as const, note: '' },
      ],
      aggregate: {
        direction_asymmetry: '',
        outlet_concentration: '',
        pillar_distribution: '',
        overall_assessment: '',
      },
    };
    const result = detectAnomalies({ events: [], newSnapshot: baseSnapshot, audit });
    expect(result.find((a) => a.trigger === 'auditor_high_flag_rate')?.details).toContain('67%');
  });

  it('flags single_outlet_dominance when one outlet covers >50 % of events', () => {
    const events = [
      makeEvent({ id: 'a', sources: [{ title: 'a', url: 'https://x/a', outlet: 'Big', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
      makeEvent({ id: 'b', sources: [{ title: 'b', url: 'https://x/b', outlet: 'Big', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
      makeEvent({ id: 'c', sources: [{ title: 'c', url: 'https://x/c', outlet: 'Big', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
      makeEvent({ id: 'd', sources: [{ title: 'd', url: 'https://x/d', outlet: 'Other', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
    ];
    const result = detectAnomalies({ events, newSnapshot: baseSnapshot });
    expect(result.find((a) => a.trigger === 'single_outlet_dominance')?.details).toContain('big');
  });

  it('does NOT flag single_outlet_dominance when sources are diverse', () => {
    const events = [
      makeEvent({ id: 'a', sources: [{ title: 'a', url: 'https://x/a', outlet: 'A', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
      makeEvent({ id: 'b', sources: [{ title: 'b', url: 'https://x/b', outlet: 'B', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
      makeEvent({ id: 'c', sources: [{ title: 'c', url: 'https://x/c', outlet: 'C', fetched_at: '2026-04-23T08:00:00.000Z' }] }),
    ];
    const result = detectAnomalies({ events, newSnapshot: baseSnapshot });
    expect(result.find((a) => a.trigger === 'single_outlet_dominance')).toBeUndefined();
  });
});
