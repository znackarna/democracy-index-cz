import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { generateValidation } from '../src/pipeline/validate-external';
import type { ScoreSnapshot, StructuralBaseline } from '../src/lib/types';

function setupRoot(baseline: StructuralBaseline, timeline?: ScoreSnapshot[]): string {
  const root = mkdtempSync(path.join(tmpdir(), 'validate-test-'));
  mkdirSync(path.join(root, 'data', 'structural'), { recursive: true });
  mkdirSync(path.join(root, 'data', 'scores'), { recursive: true });
  mkdirSync(path.join(root, 'methodology'), { recursive: true });
  writeFileSync(
    path.join(root, 'data', 'structural', `${baseline.quarter}.json`),
    JSON.stringify(baseline),
  );
  if (timeline) {
    writeFileSync(path.join(root, 'data', 'scores', 'timeline.json'), JSON.stringify(timeline));
  }
  return root;
}

const FIXED_NOW = new Date('2026-04-29T08:00:00.000Z');

const realisticBaseline: StructuralBaseline = {
  quarter: '2026-Q2',
  computed_at: '2026-04-28T00:00:00.000Z',
  pillars: { electoral: 91.8, governance: 86.3, judicial: 83.9, media: 92.0, civil: 96.9, corruption: 59.0 },
  sources: [
    { index: 'V-Dem', year: 2024, value: 0.817, url: 'https://v-dem.net/' },
    { index: 'EIU', year: 2024, value: 8.08, url: 'https://eiu.example/' },
    { index: 'FH-FitW', year: 2025, value: 95, url: 'https://freedomhouse.org/' },
    { index: 'RSF', year: 2025, value: 83.96, url: 'https://rsf.org/' },
    { index: 'TI-CPI', year: 2024, value: 59, url: 'https://transparency.org/' },
    { index: 'WJP', year: 2024, value: 0.74, url: 'https://worldjusticeproject.org/' },
  ],
};

describe('generateValidation', () => {
  it('writes report to methodology/validation_<quarter>.md', async () => {
    const root = setupRoot(realisticBaseline);
    const result = await generateValidation({ quarter: '2026-Q2', projectRoot: root, now: FIXED_NOW });
    expect(result.reportPath).toContain('validation_2026-Q2.md');
    const content = readFileSync(result.reportPath, 'utf-8');
    expect(content).toContain('# Validation report — 2026-Q2');
  });

  it('compares single-dimension indices to specific pillar, not overall', async () => {
    const root = setupRoot(realisticBaseline);
    const result = await generateValidation({ quarter: '2026-Q2', projectRoot: root, now: FIXED_NOW });
    const ti = result.baselineDivergences.find((d) => d.index.startsWith('TI'));
    const rsf = result.baselineDivergences.find((d) => d.index.startsWith('RSF'));
    const wjp = result.baselineDivergences.find((d) => d.index.startsWith('WJP'));
    expect(ti?.comparisonLabel).toBe('pillar corruption');
    expect(ti?.comparisonTarget).toBe(59); // exact match — pillar IS TI CPI value
    expect(ti?.delta).toBe(0);
    expect(rsf?.comparisonLabel).toBe('pillar media');
    expect(wjp?.comparisonLabel).toBe('pillar judicial');
  });

  it('compares overall composite indices to weighted overall', async () => {
    const root = setupRoot(realisticBaseline);
    const result = await generateValidation({ quarter: '2026-Q2', projectRoot: root, now: FIXED_NOW });
    const vdem = result.baselineDivergences.find((d) => d.index.startsWith('V-Dem'));
    const eiu = result.baselineDivergences.find((d) => d.index.startsWith('EIU'));
    const fh = result.baselineDivergences.find((d) => d.index.startsWith('FH'));
    expect(vdem?.comparisonLabel).toBe('baseline overall');
    expect(eiu?.comparisonLabel).toBe('baseline overall');
    expect(fh?.comparisonLabel).toBe('baseline overall');
    // baseline weighted overall ~85.0 for the realistic baseline
    expect(result.baselineWeighted).toBeCloseTo(85.0, 1);
  });

  it('flags divergences exceeding the 10-point threshold', async () => {
    // Construct a baseline that will produce a >10 b. divergence on TI CPI
    const baseline: StructuralBaseline = {
      ...realisticBaseline,
      pillars: { ...realisticBaseline.pillars, corruption: 80 }, // we say corruption=80 but TI CPI says 59
    };
    const root = setupRoot(baseline);
    const result = await generateValidation({ quarter: '2026-Q2', projectRoot: root, now: FIXED_NOW });
    const ti = result.baselineDivergences.find((d) => d.index.startsWith('TI'));
    expect(ti?.delta).toBe(21);
    expect(ti?.exceedsThreshold).toBe(true);
    expect(result.report).toContain('⚠️');
  });

  it('skips sources with unknown index normalization', async () => {
    const baseline: StructuralBaseline = {
      ...realisticBaseline,
      sources: [
        ...realisticBaseline.sources,
        { index: 'BTI', year: 2024, value: 8.5, url: 'https://bti.example/' }, // unknown — skipped
      ],
    };
    const root = setupRoot(baseline);
    const result = await generateValidation({ quarter: '2026-Q2', projectRoot: root, now: FIXED_NOW });
    expect(result.baselineDivergences.find((d) => d.index.startsWith('BTI'))).toBeUndefined();
  });

  it('renders snapshot section when timeline has data', async () => {
    const snapshot: ScoreSnapshot = {
      week: '2026-W17',
      computed_at: '2026-04-28T20:00:00.000Z',
      overall_score: 84.3,
      pillars: { electoral: 91.8, governance: 84.3, judicial: 83.4, media: 91.5, civil: 96.4, corruption: 58.5 },
      active_events_count: 9,
      structural_baseline: '2026-Q2',
    };
    const root = setupRoot(realisticBaseline, [snapshot]);
    const result = await generateValidation({ quarter: '2026-Q2', projectRoot: root, now: FIXED_NOW });
    expect(result.latestSnapshot?.week).toBe('2026-W17');
    expect(result.report).toContain('## Latest snapshot vs baseline');
    expect(result.report).toContain('2026-W17');
  });

  it('handles empty timeline gracefully', async () => {
    const root = setupRoot(realisticBaseline);
    const result = await generateValidation({ quarter: '2026-Q2', projectRoot: root, now: FIXED_NOW });
    expect(result.latestSnapshot).toBeNull();
    expect(result.report).toContain('Žádný snapshot');
  });
});
