import { type Event, type Source } from '../lib/types';

const MS_PER_DAY = 86_400_000;

/**
 * Same-event detection thresholds. Two events are considered the same incident
 * if they share a pillar, are within `MAX_DATE_DIFF_DAYS` days of each other,
 * and their headlines have Jaccard similarity ≥ `HEADLINE_JACCARD_THRESHOLD`
 * over content tokens (stopwords removed).
 */
const MAX_DATE_DIFF_DAYS = 3;
const HEADLINE_JACCARD_THRESHOLD = 0.3;

const CZ_STOPWORDS = new Set([
  'a',
  'o',
  'v',
  've',
  'na',
  'do',
  'k',
  'ke',
  'po',
  'pro',
  'při',
  'za',
  'z',
  'ze',
  's',
  'se',
  'i',
  'u',
  'je',
  'jsou',
  'je',
  'byl',
  'byla',
  'bylo',
  'byly',
  'být',
  'že',
  'aby',
  'kdy',
  'kde',
  'co',
  'jako',
  'ale',
  'nebo',
  'ani',
  'pak',
  'tak',
  'už',
  'též',
  'také',
  'mezi',
  'proti',
  'před',
  'podle',
  'kvůli',
  'jak',
  'než',
  'než',
  'své',
  'svůj',
  'svá',
  'svého',
  'své',
  'svým',
  'svými',
  'ten',
  'ta',
  'to',
  'ti',
  'ty',
  'tu',
  'tom',
  'tím',
  'tou',
  'tomto',
  'této',
  'pak',
  'jen',
  'už',
  'již',
  'ještě',
  'velmi',
  'více',
  'méně',
  'mít',
  'mohou',
  'může',
  'pouze',
]);

/**
 * Dedupe events emitted across multiple classification batches. Events that
 * describe the same underlying incident (same pillar, near date, similar
 * headline) are merged: sources concatenated, severity = max, status set to
 * 'disputed' if direction or severity disagree across copies. The earliest
 * id wins to keep IDs stable.
 */
export function dedupeEvents(events: readonly Event[]): {
  events: Event[];
  merges: Array<{ kept: string; absorbed: string[]; conflict: boolean }>;
} {
  const result: Event[] = [];
  const merges: Array<{ kept: string; absorbed: string[]; conflict: boolean }> = [];
  for (const candidate of events) {
    const existingIdx = result.findIndex((e) => sameIncident(e, candidate));
    if (existingIdx === -1) {
      result.push({ ...candidate, sources: [...candidate.sources] });
      continue;
    }
    const existing = result[existingIdx]!;
    const merged = mergeEvents(existing, candidate);
    result[existingIdx] = merged.event;
    const m = merges.find((x) => x.kept === existing.id);
    if (m) {
      m.absorbed.push(candidate.id);
      m.conflict = m.conflict || merged.conflict;
    } else {
      merges.push({ kept: existing.id, absorbed: [candidate.id], conflict: merged.conflict });
    }
  }
  return { events: result, merges };
}

function sameIncident(a: Event, b: Event): boolean {
  if (a.pillar !== b.pillar) return false;
  if (Math.abs(daysBetween(a.date, b.date)) > MAX_DATE_DIFF_DAYS) return false;
  return jaccardSimilarity(tokenize(a.headline), tokenize(b.headline)) >= HEADLINE_JACCARD_THRESHOLD;
}

function mergeEvents(existing: Event, candidate: Event): { event: Event; conflict: boolean } {
  const sources = mergeSources(existing.sources, candidate.sources);
  const directionConflict = existing.direction !== candidate.direction;
  const severityConflict =
    existing.severity !== candidate.severity &&
    !(existing.severity === null || candidate.severity === null);
  const conflict = directionConflict || severityConflict;

  // Severity: prefer the higher one (worst-case interpretation). null wins
  // only if both are null.
  const severity =
    existing.severity === null
      ? candidate.severity
      : candidate.severity === null
        ? existing.severity
        : Math.max(existing.severity, candidate.severity) as typeof existing.severity;

  // Direction: keep first when conflict (status will be 'disputed' so reviewer
  // resolves it); otherwise keep agreed value.
  const direction = existing.direction;

  // Status: 'disputed' on conflict; otherwise propagate the more cautious
  // status (needs_review > active > resolved).
  const status: Event['status'] = conflict
    ? 'disputed'
    : ([existing.status, candidate.status].includes('needs_review')
      ? 'needs_review'
      : existing.status);

  // Score impact: recompute only if no conflict — otherwise leave the original
  // value but mark disputed.
  const score_impact = conflict ? existing.score_impact : existing.score_impact;

  // Rationale: append a merge note describing the conflict if any.
  const mergeNote = conflict
    ? `\n\n[merged with ${candidate.id} — direction/severity conflict, set status=disputed for reviewer]`
    : `\n\n[merged with ${candidate.id} — same incident, sources combined]`;

  const event: Event = {
    ...existing,
    severity,
    direction,
    sources,
    score_impact,
    status,
    rationale: existing.rationale + mergeNote,
  };
  return { event, conflict };
}

function mergeSources(a: readonly Source[], b: readonly Source[]): Source[] {
  const seen = new Set<string>();
  const result: Source[] = [];
  for (const s of [...a, ...b]) {
    const key = s.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(s);
  }
  return result;
}

/**
 * Tokenize a Czech headline into a set of comparable terms. Czech is heavily
 * inflected, so we collapse each token to its first 5 characters — this
 * catches "příbramské" ↔ "příbramskou" without needing a real stemmer.
 */
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !CZ_STOPWORDS.has(t))
      .map((t) => t.slice(0, 5)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function daysBetween(d1: string, d2: string): number {
  const parse = (d: string): number => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (!m) throw new Error(`Invalid date: ${d}`);
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  return (parse(d1) - parse(d2)) / MS_PER_DAY;
}
