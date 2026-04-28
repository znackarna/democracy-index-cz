import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getValidator, validateMany, validateOrThrow } from '../src/pipeline/validate';
import type { Event } from '../src/lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_FIXTURE = path.join(__dirname, 'fixtures', 'sample-events.json');

describe('validate (event schema)', () => {
  it('accepts the sample events fixture', async () => {
    const raw = await readFile(EVENTS_FIXTURE, 'utf-8');
    const events = JSON.parse(raw) as Event[];
    const v = await getValidator('event');
    for (const e of events) {
      const result = v.validate(e);
      expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });

  it('rejects an event missing required fields', async () => {
    const v = await getValidator('event');
    const result = v.validate({ id: '2026-W17-001', date: '2026-04-22' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects an event with an invalid pillar', async () => {
    const raw = await readFile(EVENTS_FIXTURE, 'utf-8');
    const [event] = JSON.parse(raw) as Event[];
    const broken = { ...event, pillar: 'not-a-pillar' };
    const v = await getValidator('event');
    const result = v.validate(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.instancePath.includes('pillar'))).toBe(true);
  });

  it('rejects an event with severity out of range', async () => {
    const raw = await readFile(EVENTS_FIXTURE, 'utf-8');
    const [event] = JSON.parse(raw) as Event[];
    const broken = { ...event, severity: 9 };
    const v = await getValidator('event');
    const result = v.validate(broken);
    expect(result.valid).toBe(false);
  });

  it('validateOrThrow returns the value on success and throws on failure', async () => {
    const raw = await readFile(EVENTS_FIXTURE, 'utf-8');
    const [event] = JSON.parse(raw) as Event[];
    const out = await validateOrThrow<Event>('event', event);
    expect(out.id).toBe(event!.id);
    await expect(validateOrThrow('event', { id: 'bad' })).rejects.toThrow(/Schema validation failed/);
  });

  it('validateMany separates valid from invalid items', async () => {
    const raw = await readFile(EVENTS_FIXTURE, 'utf-8');
    const events = JSON.parse(raw) as Event[];
    const result = await validateMany<Event>('event', [
      events[0],
      { broken: true },
      events[1],
      null,
    ]);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0]?.index).toBe(1);
    expect(result.invalid[1]?.index).toBe(3);
  });
});
