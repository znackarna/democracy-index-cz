import { describe, expect, it } from 'vitest';
import { dedupeEvents } from '../src/pipeline/dedupe';
import type { Event } from '../src/lib/types';

function makeEvent(overrides: Partial<Event> & { id: string; headline: string }): Event {
  const base: Event = {
    id: overrides.id,
    date: '2026-04-22',
    headline: overrides.headline,
    summary: 'Default summary, paraphrased and at least twenty characters long.',
    pillar: 'judicial',
    severity: 3,
    direction: -1,
    duration: 'one_off',
    sources: [
      {
        title: 'src',
        url: `https://example.test/${overrides.id}`,
        outlet: 'Test',
        fetched_at: '2026-04-23T08:00:00.000Z',
      },
    ],
    score_impact: -1.5,
    rationale: 'Severity 3 per rubric §3 — broad institutional consequences for democracy.',
    reviewer: 'auto',
    status: 'active',
    created_at: '2026-04-23T08:00:00.000Z',
  };
  return { ...base, ...overrides };
}

describe('dedupeEvents', () => {
  it('returns input unchanged when there are no near-duplicates', () => {
    const a = makeEvent({ id: '2026-W17-001', headline: 'Vláda schválila novelu zákona o ÚS' });
    const b = makeEvent({
      id: '2026-W17-002',
      headline: 'Premiér napadl novináře na tiskové konferenci',
      pillar: 'media',
    });
    const result = dedupeEvents([a, b]);
    expect(result.events).toHaveLength(2);
    expect(result.merges).toEqual([]);
  });

  it('merges two events describing the same incident across outlets', () => {
    const a = makeEvent({
      id: '2026-W17-003',
      headline: 'Policie zasahovala v příbramské nemocnici, zadržela třináct lidí',
      pillar: 'corruption',
    });
    const b = makeEvent({
      id: '2026-W17-017',
      headline: 'Policie zadržela 13 osob při razii na krajský úřad a příbramskou nemocnici',
      pillar: 'corruption',
      sources: [
        {
          title: 'aktualne',
          url: 'https://aktualne.cz/article-x',
          outlet: 'Aktuálně.cz',
          fetched_at: '2026-04-23T08:00:00.000Z',
        },
      ],
    });
    const result = dedupeEvents([a, b]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.sources).toHaveLength(2);
    expect(result.events[0]?.id).toBe('2026-W17-003'); // first kept
    expect(result.merges).toHaveLength(1);
    expect(result.merges[0]?.absorbed).toEqual(['2026-W17-017']);
  });

  it('marks status=disputed when direction conflicts across copies', () => {
    const a = makeEvent({
      id: '2026-W17-003',
      headline: 'Policie zasahovala v příbramské nemocnici, zadržela třináct lidí',
      pillar: 'corruption',
      direction: -1,
      severity: 3,
    });
    const b = makeEvent({
      id: '2026-W17-017',
      headline: 'Policie zadržela třináct lidí, EPPO dohlíží na vyšetřování',
      pillar: 'corruption',
      direction: 1,
      severity: 3,
    });
    const result = dedupeEvents([a, b]);
    expect(result.events[0]?.status).toBe('disputed');
    expect(result.merges[0]?.conflict).toBe(true);
    expect(result.events[0]?.rationale).toContain('disputed');
  });

  it('keeps the higher severity when severities disagree', () => {
    const a = makeEvent({
      id: '2026-W17-001',
      headline: 'Ministr napadl konkrétního soudce v probíhající kauze',
      severity: 2,
      direction: -1,
    });
    const b = makeEvent({
      id: '2026-W17-002',
      headline: 'Ministr veřejně útočí na konkrétního soudce',
      severity: 4,
      direction: -1,
    });
    const result = dedupeEvents([a, b]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.severity).toBe(4);
  });

  it('does NOT merge events with different pillars', () => {
    const a = makeEvent({ id: '2026-W17-001', headline: 'Vláda zasáhla', pillar: 'governance' });
    const b = makeEvent({ id: '2026-W17-002', headline: 'Vláda zasáhla', pillar: 'judicial' });
    const result = dedupeEvents([a, b]);
    expect(result.events).toHaveLength(2);
  });

  it('does NOT merge events more than 3 days apart', () => {
    const a = makeEvent({
      id: '2026-W17-001',
      headline: 'Premiér napadl soudce ve čtvrtek',
      date: '2026-04-22',
    });
    const b = makeEvent({
      id: '2026-W18-001',
      headline: 'Premiér napadl soudce v úterý',
      date: '2026-04-28',
    });
    const result = dedupeEvents([a, b]);
    expect(result.events).toHaveLength(2);
  });

  it('deduplicates source URLs case-insensitively when merging', () => {
    const sharedUrl = 'https://example.test/SAME-article';
    const a = makeEvent({
      id: 'A',
      headline: 'Headline shared incident significant text',
      sources: [
        {
          title: 'a',
          url: sharedUrl,
          outlet: 'Outlet A',
          fetched_at: '2026-04-23T08:00:00.000Z',
        },
      ],
    });
    const b = makeEvent({
      id: 'B',
      headline: 'Headline shared incident significant content',
      sources: [
        {
          title: 'b',
          url: sharedUrl.toLowerCase(),
          outlet: 'Outlet B',
          fetched_at: '2026-04-23T08:00:00.000Z',
        },
      ],
    });
    const result = dedupeEvents([a, b]);
    expect(result.events[0]?.sources).toHaveLength(1);
  });
});
