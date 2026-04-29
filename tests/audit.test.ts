import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { applyAuditVerdicts, auditEvents, type AuditResult } from '../src/pipeline/audit';
import type { Event } from '../src/lib/types';

function mockClient(jsonResponse: unknown): Anthropic {
  const create = vi.fn(async () => ({
    content: [{ type: 'text', text: JSON.stringify(jsonResponse) }],
  }));
  return { messages: { create } } as unknown as Anthropic;
}

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

const STUB_CONTEXT = {
  auditorPrompt: 'audit prompt stub',
  pillarsContext: 'pillars stub',
  rubricContext: 'rubric stub',
};

describe('auditEvents', () => {
  it('returns synthesized empty result for empty event list (no LLM call)', async () => {
    const create = vi.fn();
    const client = { messages: { create } } as unknown as Anthropic;
    const result = await auditEvents([], { ...STUB_CONTEXT, client });
    expect(result.per_event).toEqual([]);
    expect(result.aggregate.overall_assessment).toContain('No events');
    expect(create).not.toHaveBeenCalled();
  });

  it('parses auditor JSON output', async () => {
    const events = [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })];
    const client = mockClient({
      per_event: [
        { event_id: 'a', verdict: 'pass', note: '' },
        { event_id: 'b', verdict: 'flag', note: 'severity moc vysoká vůči rationale' },
      ],
      aggregate: {
        direction_asymmetry: 'OK',
        outlet_concentration: 'OK',
        pillar_distribution: 'OK',
        overall_assessment: 'Generally OK with one flag',
      },
    });
    const result = await auditEvents(events, { ...STUB_CONTEXT, client });
    expect(result.per_event).toHaveLength(2);
    expect(result.per_event[1]?.verdict).toBe('flag');
    expect(result.aggregate.overall_assessment).toContain('one flag');
  });
});

describe('applyAuditVerdicts', () => {
  it('leaves pass events unchanged', () => {
    const events = [makeEvent({ id: 'a' })];
    const result: AuditResult = {
      per_event: [{ event_id: 'a', verdict: 'pass', note: '' }],
      aggregate: {
        direction_asymmetry: '',
        outlet_concentration: '',
        pillar_distribution: '',
        overall_assessment: '',
      },
    };
    const after = applyAuditVerdicts(events, result);
    expect(after[0]).toBe(events[0]); // referential equality — no mutation
  });

  it('appends auditor note to rationale on flag, status unchanged', () => {
    const events = [makeEvent({ id: 'a' })];
    const result: AuditResult = {
      per_event: [{ event_id: 'a', verdict: 'flag', note: 'severity vs rationale mismatch' }],
      aggregate: {
        direction_asymmetry: '',
        outlet_concentration: '',
        pillar_distribution: '',
        overall_assessment: '',
      },
    };
    const after = applyAuditVerdicts(events, result);
    expect(after[0]?.rationale).toContain('[auditor: flag]');
    expect(after[0]?.rationale).toContain('mismatch');
    expect(after[0]?.status).toBe('active');
  });

  it('changes status to needs_review on downgrade and appends note', () => {
    const events = [makeEvent({ id: 'a' })];
    const result: AuditResult = {
      per_event: [{ event_id: 'a', verdict: 'downgrade', note: 'pillar misassigned' }],
      aggregate: {
        direction_asymmetry: '',
        outlet_concentration: '',
        pillar_distribution: '',
        overall_assessment: '',
      },
    };
    const after = applyAuditVerdicts(events, result);
    expect(after[0]?.status).toBe('needs_review');
    expect(after[0]?.rationale).toContain('[auditor: downgrade]');
    expect(after[0]?.severity).toBe(3); // severity NOT overwritten
    expect(after[0]?.pillar).toBe('judicial'); // pillar NOT overwritten
  });

  it('does not downgrade status that is already non-active (e.g. disputed)', () => {
    const events = [makeEvent({ id: 'a', status: 'disputed' })];
    const result: AuditResult = {
      per_event: [{ event_id: 'a', verdict: 'downgrade', note: 'x' }],
      aggregate: {
        direction_asymmetry: '',
        outlet_concentration: '',
        pillar_distribution: '',
        overall_assessment: '',
      },
    };
    const after = applyAuditVerdicts(events, result);
    expect(after[0]?.status).toBe('disputed'); // disputed wins over downgrade
  });
});
