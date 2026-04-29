import { describe, expect, it } from 'vitest';
import { capSeverityBySourceCount } from '../src/pipeline/cap-severity';
import type { Event } from '../src/lib/types';

function makeEvent(overrides: Partial<Event> & { id: string }): Event {
  const base: Event = {
    id: overrides.id,
    date: '2026-04-22',
    headline: 'Test event',
    summary: 'Twenty-character minimum summary text for the schema requirement.',
    pillar: 'judicial',
    severity: 3,
    direction: -1,
    duration: 'one_off',
    sources: [
      {
        title: 'src',
        url: 'https://a.test/x',
        outlet: 'Outlet A',
        fetched_at: '2026-04-23T08:00:00.000Z',
      },
    ],
    score_impact: -1.5,
    rationale: 'Severity 3 per rubric §3 — significant institutional consequences for democracy.',
    reviewer: 'auto',
    status: 'active',
    created_at: '2026-04-23T08:00:00.000Z',
  };
  return { ...base, ...overrides };
}

const SOURCE_A = { title: 'a', url: 'https://a.test/1', outlet: 'Outlet A', fetched_at: '2026-04-23T08:00:00.000Z' };
const SOURCE_B = { title: 'b', url: 'https://b.test/1', outlet: 'Outlet B', fetched_at: '2026-04-23T08:00:00.000Z' };
const SOURCE_C = { title: 'c', url: 'https://c.test/1', outlet: 'Outlet C', fetched_at: '2026-04-23T08:00:00.000Z' };

describe('capSeverityBySourceCount', () => {
  it('passes severity 1 and 2 with single outlet untouched', () => {
    const e1 = makeEvent({ id: '1', severity: 1, score_impact: -0.2 });
    const e2 = makeEvent({ id: '2', severity: 2, score_impact: -0.5 });
    const { events, capped } = capSeverityBySourceCount([e1, e2]);
    expect(events.map((e) => e.severity)).toEqual([1, 2]);
    expect(capped).toEqual([]);
  });

  it('downgrades severity 3 single-source to severity 2', () => {
    const e = makeEvent({ id: '3', severity: 3, score_impact: -1.5 });
    const { events, capped } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBe(2);
    expect(events[0]?.score_impact).toBe(-0.5);
    expect(events[0]?.rationale).toContain('severity capped from 3 to 2');
    expect(capped).toEqual([{ id: '3', from: 3, to: 2, outletCount: 1 }]);
  });

  it('keeps severity 3 with two distinct outlets', () => {
    const e = makeEvent({ id: '3-ok', severity: 3, sources: [SOURCE_A, SOURCE_B] });
    const { events, capped } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBe(3);
    expect(capped).toEqual([]);
  });

  it('downgrades severity 4 with two outlets to severity 3', () => {
    const e = makeEvent({
      id: '4',
      severity: 4,
      direction: -1,
      score_impact: -3,
      sources: [SOURCE_A, SOURCE_B],
    });
    const { events, capped } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBe(3);
    expect(events[0]?.score_impact).toBe(-1.5);
    expect(capped[0]).toEqual({ id: '4', from: 4, to: 3, outletCount: 2 });
  });

  it('keeps severity 5 with three or more outlets', () => {
    const e = makeEvent({
      id: '5',
      severity: 5,
      direction: -1,
      score_impact: -6,
      sources: [SOURCE_A, SOURCE_B, SOURCE_C],
    });
    const { events, capped } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBe(5);
    expect(capped).toEqual([]);
  });

  it('downgrades severity 5 with single outlet to severity 2', () => {
    const e = makeEvent({ id: '5-bad', severity: 5, direction: -1, score_impact: -6 });
    const { events, capped } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBe(2);
    expect(events[0]?.score_impact).toBe(-0.5);
    expect(capped[0]).toEqual({ id: '5-bad', from: 5, to: 2, outletCount: 1 });
  });

  it('counts outlets case-insensitively (two URLs from same outlet count as one)', () => {
    const e = makeEvent({
      id: '3-dup',
      severity: 3,
      sources: [
        { ...SOURCE_A, url: 'https://a.test/1' },
        { ...SOURCE_A, url: 'https://a.test/2', outlet: 'outlet a' }, // case-different but same outlet
      ],
    });
    const { events } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBe(2); // capped because still 1 unique outlet
  });

  it('preserves null severity (audit-flagged events)', () => {
    const e = makeEvent({ id: 'null', severity: null, score_impact: 0 });
    const { events, capped } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBeNull();
    expect(capped).toEqual([]);
  });

  it('recomputes positive direction correctly', () => {
    const e = makeEvent({
      id: 'pos',
      severity: 4,
      direction: 1,
      score_impact: 3,
      sources: [SOURCE_A], // single outlet — should cap to 2
    });
    const { events } = capSeverityBySourceCount([e]);
    expect(events[0]?.severity).toBe(2);
    expect(events[0]?.score_impact).toBe(0.5);
  });
});
