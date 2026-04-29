import {
  PILLARS,
  PILLAR_WEIGHTS,
  type Pillar,
  type StructuralBaseline,
} from './types';

/**
 * Shared logic for comparing our democracy index against the external
 * benchmarks that fed into the structural baseline. Used by both:
 *
 * - `src/pipeline/validate-external.ts` — generates quarterly Markdown report
 * - `src/app/lib/data.ts` → IndexComparison component on the dashboard
 *
 * Keeping it in one place ensures the dashboard and the audit report tell
 * the same story.
 */

export const SUSTAINED_DIVERGENCE_THRESHOLD = 10.0;

/**
 * Single-dimension indices map to a specific pillar. Comparing TI CPI to our
 * weighted overall is misleading — TI CPI is exactly our corruption pillar's
 * input, so the meaningful comparison is TI CPI vs corruption pillar.
 *
 * Multi-dimension indices (V-Dem LDI, EIU Democracy Index, Freedom House
 * FitW) are overall composites and compare to our weighted overall.
 */
export const SINGLE_DIMENSION_PILLAR: Record<string, Pillar> = {
  RSF: 'media',
  'TI-CPI': 'corruption',
  TI: 'corruption',
  WJP: 'judicial',
};

export interface IndexComparison {
  /** Index name as written in baseline.sources[].index, e.g. "V-Dem". */
  index: string;
  /** Year the value is from. */
  year: number;
  /** Original published value before normalization (V-Dem 0.817, EIU 8.08, FH 95...). */
  rawValue: number;
  /** Normalized to 0-100 scale matching our index. */
  externalNormalized: number;
  /** What we compare against — weighted overall or specific pillar score. */
  comparisonTarget: number;
  /** Human-readable label for the target ("baseline overall", "pillar judicial"). */
  comparisonLabel: string;
  /** Optional pillar — set when the comparison is single-dimension. */
  pillar: Pillar | null;
  /** Difference: comparisonTarget − externalNormalized (positive = our score is higher). */
  delta: number;
  /** True if |delta| exceeds SUSTAINED_DIVERGENCE_THRESHOLD. */
  exceedsThreshold: boolean;
  /** URL of the source. */
  url: string;
  /** Optional notes from baseline.sources[].notes. */
  notes?: string | undefined;
}

export function baselineWeightedOverall(baseline: StructuralBaseline): number {
  return round1(PILLARS.reduce((s, p) => s + baseline.pillars[p] * PILLAR_WEIGHTS[p], 0));
}

export function computeIndexComparisons(baseline: StructuralBaseline): IndexComparison[] {
  const baselineOverall = baselineWeightedOverall(baseline);
  const out: IndexComparison[] = [];
  for (const s of baseline.sources) {
    const normalized = normalizeExternalScore(s.index, s.value);
    if (normalized === null) continue;
    const idx = s.index.toUpperCase();
    const pillar = SINGLE_DIMENSION_PILLAR[idx] ?? null;
    const target = pillar ? baseline.pillars[pillar] : baselineOverall;
    const label = pillar ? `pillar ${pillar}` : 'baseline overall';
    const delta = round1(target - normalized);
    out.push({
      index: s.index,
      year: s.year,
      rawValue: s.value,
      externalNormalized: normalized,
      comparisonTarget: target,
      comparisonLabel: label,
      pillar,
      delta,
      exceedsThreshold: Math.abs(delta) > SUSTAINED_DIVERGENCE_THRESHOLD,
      url: s.url,
      notes: s.notes,
    });
  }
  return out;
}

/**
 * Normalize an external score to a 0-100 scale matching our index. Returns
 * null if the index is unknown — we'd rather skip than misnormalize.
 *
 * - V-Dem indices are 0-1 → ×100
 * - EIU is 0-10 → ×10
 * - WJP overall is 0-1 → ×100
 * - FH FitW, RSF, TI CPI are already 0-100
 */
export function normalizeExternalScore(index: string, value: number): number | null {
  const idx = index.toUpperCase();
  if (idx.startsWith('V-DEM') || idx === 'WJP') return round1(value * 100);
  if (idx === 'EIU') return round1(value * 10);
  if (idx === 'FH-FITW' || idx === 'FH' || idx === 'RSF' || idx === 'TI-CPI' || idx === 'TI')
    return round1(value);
  return null;
}

const round1 = (x: number): number => Math.round(x * 10) / 10;
