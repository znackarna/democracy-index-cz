import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  PILLARS,
  PILLAR_WEIGHTS,
  type Pillar,
  type ScoreSnapshot,
  type StructuralBaseline,
} from '../lib/types';

/**
 * Quarterly validation per CLAUDE.md sekce Validace + methodology/governance.md.
 *
 * Compares our index against the external benchmarks that fed into the
 * structural baseline. We don't have a database of historical V-Dem/EIU
 * trajectories yet (full backtest is iter 10+), so this report covers:
 *
 * 1. **Baseline divergence** — náš weighted overall vs every external index
 *    individually. Threshold for action: > 10 bodů sustained over 2 quarters.
 * 2. **Snapshot vs baseline** — jak moc události v aktuálním kvartálu posunuly
 *    skóre. Velký posun = signal sledovat události detailněji.
 * 3. **Per-pillar consistency** — kde se náš pillar nejvíce liší od reference,
 *    s diagnostickou poznámkou (např. corruption pillar = jen TI CPI, takže
 *    diff = 0).
 *
 * Report se zapisuje do `methodology/validation_YYYY-Qx.md` a je commitnutý do
 * gitu jako trvalý záznam. Workflow může běžet kvartálně (iter 10+ jako další
 * GH Actions cron).
 */

const DEFAULT_PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const SUSTAINED_DIVERGENCE_THRESHOLD = 10.0;

export interface ValidateOptions {
  /** Quarter id of the structural baseline to validate (e.g. '2026-Q2'). */
  quarter: string;
  projectRoot?: string;
  /** Override the now timestamp for deterministic output (used in tests). */
  now?: Date;
}

export interface ExternalDivergence {
  index: string;
  externalScale01_100: number;
  /** What we compare against — either weighted overall or a specific pillar score. */
  comparisonTarget: number;
  comparisonLabel: string;
  delta: number;
  /** True if |delta| exceeds the actionable threshold. */
  exceedsThreshold: boolean;
}

export interface ValidationResult {
  quarter: string;
  baseline: StructuralBaseline;
  baselineWeighted: number;
  latestSnapshot: ScoreSnapshot | null;
  baselineDivergences: ExternalDivergence[];
  /** Markdown text that gets written to methodology/validation_<quarter>.md. */
  report: string;
  reportPath: string;
}

export async function generateValidation(options: ValidateOptions): Promise<ValidationResult> {
  const root = options.projectRoot ?? DEFAULT_PROJECT_ROOT;
  const now = options.now ?? new Date();

  const baseline = JSON.parse(
    await readFile(path.join(root, 'data', 'structural', `${options.quarter}.json`), 'utf-8'),
  ) as StructuralBaseline;

  const baselineWeighted = round1(
    PILLARS.reduce((s, p) => s + baseline.pillars[p] * PILLAR_WEIGHTS[p], 0),
  );

  const timeline = await loadTimeline(root);
  const latestSnapshot = timeline.at(-1) ?? null;

  const divergences = computeDivergences(baseline, baselineWeighted);

  const reportPath = path.join(root, 'methodology', `validation_${options.quarter}.md`);
  const report = renderReport({
    quarter: options.quarter,
    baseline,
    baselineWeighted,
    latestSnapshot,
    divergences,
    now,
  });

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report, 'utf-8');

  return {
    quarter: options.quarter,
    baseline,
    baselineWeighted,
    latestSnapshot,
    baselineDivergences: divergences,
    report,
    reportPath,
  };
}

async function loadTimeline(root: string): Promise<ScoreSnapshot[]> {
  try {
    const raw = await readFile(path.join(root, 'data', 'scores', 'timeline.json'), 'utf-8');
    return (JSON.parse(raw) as ScoreSnapshot[]).sort((a, b) => a.week.localeCompare(b.week));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Single-dimension indices map to a specific pillar. Comparing TI CPI to our
 * weighted overall is misleading — TI CPI is exactly our corruption pillar's
 * input, so the meaningful comparison is TI CPI vs corruption pillar (not
 * overall). Same for RSF↔media, WJP↔judicial.
 *
 * Multi-dimension indices (V-Dem LDI, EIU Democracy Index, Freedom House FitW)
 * are overall composites and compare to our weighted overall.
 */
const SINGLE_DIMENSION_PILLAR: Record<string, Pillar> = {
  RSF: 'media',
  'TI-CPI': 'corruption',
  TI: 'corruption',
  WJP: 'judicial',
};

/**
 * Normalize each external source value to 0-100 scale and compare against the
 * appropriate target (weighted overall for composites, specific pillar for
 * single-dimension). Skips structural-baseline source entries with unknown
 * index normalization.
 */
function computeDivergences(
  baseline: StructuralBaseline,
  baselineWeighted: number,
): ExternalDivergence[] {
  const out: ExternalDivergence[] = [];
  for (const s of baseline.sources) {
    const normalized = normalizeExternalScore(s.index, s.value);
    if (normalized === null) continue;
    const idx = s.index.toUpperCase();
    const pillar = SINGLE_DIMENSION_PILLAR[idx];
    const target = pillar ? baseline.pillars[pillar] : baselineWeighted;
    const label = pillar ? `pillar ${pillar}` : 'baseline overall';
    const delta = round1(target - normalized);
    out.push({
      index: `${s.index} (${s.year})`,
      externalScale01_100: normalized,
      comparisonTarget: target,
      comparisonLabel: label,
      delta,
      exceedsThreshold: Math.abs(delta) > SUSTAINED_DIVERGENCE_THRESHOLD,
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
function normalizeExternalScore(index: string, value: number): number | null {
  const idx = index.toUpperCase();
  if (idx.startsWith('V-DEM') || idx === 'WJP') return round1(value * 100);
  if (idx === 'EIU') return round1(value * 10);
  if (idx === 'FH-FITW' || idx === 'FH' || idx === 'RSF' || idx === 'TI-CPI' || idx === 'TI')
    return round1(value);
  return null;
}

function renderReport(args: {
  quarter: string;
  baseline: StructuralBaseline;
  baselineWeighted: number;
  latestSnapshot: ScoreSnapshot | null;
  divergences: ExternalDivergence[];
  now: Date;
}): string {
  const lines: string[] = [];
  lines.push(`# Validation report — ${args.quarter}`);
  lines.push('');
  lines.push(`Generated automatically ${args.now.toISOString().slice(0, 10)} by \`pipeline:validate\`. Per [methodology/governance.md](governance.md) a [CLAUDE.md sekce Validace](../CLAUDE.md).`);
  lines.push('');

  // Section 1 — baseline vs externals
  lines.push('## Baseline divergence');
  lines.push('');
  lines.push(`Náš strukturální baseline (vážený overall) = **${args.baselineWeighted.toFixed(1)}**.`);
  lines.push('');
  lines.push(`Práh pro methodology review: trvalá divergence > **${SUSTAINED_DIVERGENCE_THRESHOLD}** bodů ve dvou po sobě jdoucích kvartálech vůči **referenčnímu** indexu (V-Dem nebo EIU). Krátkodobé odchylky tolerujeme — naše skóre váží pilíře jinak než externí indexy a obsahuje týdenní eventovou složku.`);
  lines.push('');
  lines.push('| Externí index | Externí (0–100) | Náš srovnávaný cíl | Hodnota | Δ | Nad prahem? |');
  lines.push('|---|--:|---|--:|--:|:--:|');
  for (const d of args.divergences) {
    const flag = d.exceedsThreshold ? '⚠️' : '✓';
    const sign = d.delta >= 0 ? '+' : '';
    lines.push(
      `| ${d.index} | ${d.externalScale01_100.toFixed(1)} | ${d.comparisonLabel} | ${d.comparisonTarget.toFixed(1)} | ${sign}${d.delta.toFixed(1)} | ${flag} |`,
    );
  }
  lines.push('');
  lines.push('Single-dimension indexy (RSF, TI CPI, WJP) se porovnávají s konkrétním pilířem, ne s overall. RSF↔media, TI CPI↔corruption, WJP↔judicial. Multi-dimension (V-Dem LDI, EIU, FH FitW) jsou overall composity → srovnávané s naším weighted overall.');
  lines.push('');

  // Threshold check
  const exceeded = args.divergences.filter((d) => d.exceedsThreshold);
  if (exceeded.length === 0) {
    lines.push('**Závěr:** žádný externí index neukazuje divergenci > 10 b. Baseline je v normální variabilitě.');
  } else {
    lines.push(`**Závěr:** ${exceeded.length} index(y) přes práh:`);
    for (const d of exceeded) {
      lines.push(`- **${d.index}**: ${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(1)} b.`);
    }
    lines.push('');
    lines.push('Pokud se rozdíl objeví i v dalším kvartálu, otevřít issue typu `methodology-review` a spustit per-pillar audit mappingu (`methodology/structural_mapping.md`).');
  }
  lines.push('');

  // Section 2 — snapshot vs baseline
  if (args.latestSnapshot) {
    const eventDelta = round1(args.latestSnapshot.overall_score - args.baselineWeighted);
    lines.push('## Latest snapshot vs baseline');
    lines.push('');
    lines.push(`Nejnovější snapshot: **${args.latestSnapshot.week}** — overall **${args.latestSnapshot.overall_score.toFixed(1)}**.`);
    lines.push(`Posun od baseline: **${eventDelta >= 0 ? '+' : ''}${eventDelta.toFixed(1)} b.** (od ${args.latestSnapshot.active_events_count} aktivních událostí).`);
    lines.push('');
    lines.push('| Pilíř | Baseline | Snapshot | Δ |');
    lines.push('|---|--:|--:|--:|');
    for (const p of PILLARS) {
      const delta = round1(args.latestSnapshot.pillars[p] - args.baseline.pillars[p]);
      const sign = delta >= 0 ? '+' : '';
      lines.push(
        `| ${p} | ${args.baseline.pillars[p].toFixed(1)} | ${args.latestSnapshot.pillars[p].toFixed(1)} | ${sign}${delta.toFixed(1)} |`,
      );
    }
    lines.push('');
  } else {
    lines.push('## Latest snapshot vs baseline');
    lines.push('');
    lines.push('_Žádný snapshot v `data/scores/timeline.json` — pipeline neproběhla._');
    lines.push('');
  }

  // Section 3 — per-pillar diagnostic
  lines.push('## Per-pillar diagnostika');
  lines.push('');
  lines.push('Připomínka mapování (z `methodology/structural_mapping.md`):');
  lines.push('');
  for (const p of PILLARS) {
    lines.push(`- **${p}** (${(PILLAR_WEIGHTS[p] * 100).toFixed(0)} %) = ${args.baseline.pillars[p].toFixed(1)}`);
  }
  lines.push('');
  lines.push('Pokud divergence v sekci 1 překročí práh, prozkoumej, který pilíř k tomu nejvíce přispívá. Časté zdroje šumu:');
  lines.push('- `corruption` má jen TI CPI (single-source), takže náš pillar = TI CPI exact value. Jakékoli divergence musí jít odjinud.');
  lines.push('- `judicial` používá WJP overall jako proxy (per-factor data nedostupná). Diverze proti WJP samotné = 0.');
  lines.push('- FH zahrnuje 4-bodovou škálu pro 7 kategorií, takže drobné rozdíly v FH se zvětší při normalizaci na 0–100.');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('_Tento report se generuje automaticky přes `npm run pipeline:validate -- --quarter=<Q>`. Pro nové kvartály vznikne nový soubor; existující se přepíše po novém běhu (verzování drží git)._');
  return lines.join('\n');
}

const round1 = (x: number): number => Math.round(x * 10) / 10;

// ---------------------------------------------------------------------------
// CLI entry — `npm run pipeline:validate -- --quarter=2026-Q2`
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const quarterArg = args.find((a) => a.startsWith('--quarter='))?.split('=')[1];
  if (!quarterArg) {
    console.error('Usage: pipeline:validate --quarter=YYYY-Qx');
    process.exit(2);
  }
  console.log(`▶ generate validation report for ${quarterArg}`);
  const result = await generateValidation({ quarter: quarterArg });
  console.log('');
  console.log(`baseline weighted overall: ${result.baselineWeighted}`);
  console.log('divergences:');
  for (const d of result.baselineDivergences) {
    const flag = d.exceedsThreshold ? '⚠️' : '✓';
    const sign = d.delta >= 0 ? '+' : '';
    console.log(`  ${flag} ${d.index.padEnd(20)} ext=${d.externalScale01_100.toFixed(1).padStart(5)} vs ${d.comparisonLabel.padEnd(22)} ${d.comparisonTarget.toFixed(1).padStart(5)} Δ=${sign}${d.delta}`);
  }
  console.log('');
  console.log(`wrote ${result.reportPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
}
