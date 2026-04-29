import { type Event, type Severity } from '../lib/types';

/**
 * Source-count → severity cap rule per methodology/governance.md.
 *
 * | Severity | Min unique outlets |
 * | 1, 2     | 1                  |
 * | 3        | 2                  |
 * | 4, 5     | 3                  |
 *
 * Outlets are counted unique by `outlet` field (case-insensitive). Two URLs from
 * the same outlet count as one source. If an event violates the rule, severity
 * is downgraded to the highest supported level, score_impact is recomputed, and
 * a `[severity capped from N to M ...]` note is appended to rationale.
 */

const MIN_OUTLETS_FOR_SEVERITY: Record<Severity, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 3,
};

const SEVERITY_MAGNITUDE: Record<Severity, number> = {
  1: 0.2,
  2: 0.5,
  3: 1.5,
  4: 3.0,
  5: 6.0,
};

export interface CapAdjustment {
  id: string;
  from: Severity;
  to: Severity;
  outletCount: number;
}

export interface CapResult {
  events: Event[];
  capped: CapAdjustment[];
}

export function capSeverityBySourceCount(events: readonly Event[]): CapResult {
  const result: Event[] = [];
  const capped: CapAdjustment[] = [];

  for (const event of events) {
    if (event.severity === null) {
      result.push(event);
      continue;
    }
    const outletCount = countUniqueOutlets(event);
    const required = MIN_OUTLETS_FOR_SEVERITY[event.severity];
    if (outletCount >= required) {
      result.push(event);
      continue;
    }
    const newSeverity = highestSupportedSeverity(outletCount);
    const newImpact = newSeverity === null ? 0 : SEVERITY_MAGNITUDE[newSeverity] * event.direction;
    const note = `\n\n[severity capped from ${event.severity} to ${newSeverity ?? 'null'} due to source-count rule: ${outletCount} unique outlet${outletCount === 1 ? '' : 's'}, ${required} required for severity ${event.severity}]`;
    result.push({
      ...event,
      severity: newSeverity,
      score_impact: round1(newImpact),
      rationale: event.rationale + note,
    });
    if (newSeverity !== null) {
      capped.push({ id: event.id, from: event.severity, to: newSeverity, outletCount });
    }
  }

  return { events: result, capped };
}

function countUniqueOutlets(event: Event): number {
  const seen = new Set<string>();
  for (const s of event.sources) seen.add(s.outlet.toLowerCase());
  return seen.size;
}

/**
 * Given a (possibly insufficient) outlet count, return the highest severity
 * that can be supported. Returns null only if outletCount === 0 (which
 * shouldn't happen since the schema requires ≥ 1 source).
 */
function highestSupportedSeverity(outletCount: number): Severity | null {
  if (outletCount >= 3) return 5;
  if (outletCount >= 2) return 3;
  if (outletCount >= 1) return 2;
  return null;
}

const round1 = (x: number): number => Math.round(x * 10) / 10;
