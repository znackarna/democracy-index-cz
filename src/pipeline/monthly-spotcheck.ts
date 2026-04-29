import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Event } from '../lib/types';

/**
 * Generates a monthly spot-check GitHub issue body. The workflow
 * `.github/workflows/monthly-spotcheck.yml` runs this on the 1st of each
 * month, then opens an issue with the resulting markdown for human review of
 * 10 random events from the previous month.
 *
 * Sampling is **deterministic given the month** (mulberry32 seeded with month
 * string) — re-running the workflow produces the same sample, which makes
 * spot-check reproducible.
 *
 * Per methodology/governance.md vrstva 5: non-blocking calibration loop.
 */

const DEFAULT_PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const SAMPLE_SIZE = 10;

export interface SpotcheckOptions {
  /** Month to sample, in YYYY-MM format. */
  month: string;
  projectRoot?: string;
  sampleSize?: number;
}

export interface SpotcheckResult {
  month: string;
  totalEvents: number;
  sampled: Event[];
  /** Markdown body suitable for `gh issue create --body-file`. */
  issueBody: string;
}

export async function generateMonthlySpotcheck(
  options: SpotcheckOptions,
): Promise<SpotcheckResult> {
  if (!/^\d{4}-\d{2}$/.test(options.month)) {
    throw new Error(`Invalid month format: ${options.month} (expected YYYY-MM)`);
  }
  const root = options.projectRoot ?? DEFAULT_PROJECT_ROOT;
  const events = await loadEventsForMonth(root, options.month);
  const sampled = sampleDeterministic(events, options.sampleSize ?? SAMPLE_SIZE, options.month);
  const issueBody = renderIssue(options.month, events.length, sampled);
  return {
    month: options.month,
    totalEvents: events.length,
    sampled,
    issueBody,
  };
}

async function loadEventsForMonth(root: string, month: string): Promise<Event[]> {
  const eventsDir = path.join(root, 'data', 'events');
  let entries: string[];
  try {
    entries = await readdir(eventsDir);
  } catch {
    return [];
  }
  const files = entries.filter((f) => /^\d{4}-W\d{2}\.json$/.test(f));
  const out: Event[] = [];
  for (const f of files) {
    const raw = await readFile(path.join(eventsDir, f), 'utf-8');
    const events = JSON.parse(raw) as Event[];
    for (const e of events) {
      // Filter by event date being in the requested month. Event date format is YYYY-MM-DD.
      if (e.date.startsWith(month)) out.push(e);
    }
  }
  return out;
}

/**
 * Deterministic Fisher-Yates with a mulberry32 PRNG seeded from the month
 * string. Same month → same sample, regardless of when run.
 */
function sampleDeterministic<T>(items: readonly T[], n: number, seed: string): T[] {
  const arr = [...items];
  const rng = mulberry32(stringHash(seed));
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, Math.min(n, arr.length));
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function renderIssue(month: string, totalEvents: number, sampled: readonly Event[]): string {
  const lines: string[] = [];
  lines.push(`Tento issue vznikl automaticky 1. v měsíci jako součást vícevrstvého oversight modelu (viz [methodology/governance.md](../blob/main/methodology/governance.md), vrstva 5 — monthly spot-check).`);
  lines.push('');
  lines.push(`**Smysl:** projít náhodný vzorek klasifikací z minulého měsíce a říct, jestli sedí. Není to retroaktivní úprava skóre — je to **kalibrace pro budoucí prompt tuning.** Disagreements zaznamenám do dlouhodobé kalibrační databáze, nebudou hned měnit historické events.`);
  lines.push('');
  lines.push(`Měsíc: **${month}** (${totalEvents} events celkem; vzorek ${sampled.length})`);
  lines.push('');
  lines.push('Vzorek je deterministický (seed = měsíc), opakované spuštění dá stejných 10 events.');
  lines.push('');
  lines.push('---');
  lines.push('');

  if (sampled.length === 0) {
    lines.push('_Žádné events v daném měsíci — nic ke spot-checku._');
    return lines.join('\n');
  }

  sampled.forEach((e, idx) => {
    lines.push(`## ${idx + 1}. ${e.id} — ${e.headline}`);
    lines.push('');
    lines.push(`- **Datum:** ${e.date}`);
    lines.push(`- **Pillar / severity / direction:** ${e.pillar} / ${e.severity ?? 'null'} / ${e.direction}`);
    lines.push(`- **Status:** ${e.status} | **Score impact:** ${e.score_impact > 0 ? '+' : ''}${e.score_impact}`);
    lines.push(`- **Sources:** ${e.sources.map((s) => `[${s.outlet}](${s.url})`).join(' · ')}`);
    lines.push('');
    lines.push(`**Summary.** ${e.summary}`);
    lines.push('');
    lines.push('**Rationale.**');
    lines.push('');
    lines.push('> ' + e.rationale.replace(/\n+/g, '\n> '));
    lines.push('');
    lines.push('- [ ] Souhlasím s klasifikací');
    lines.push('- [ ] Nesouhlasím (popiš v komentáři)');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  lines.push('Po projití vzorku jednoduše komentuj nebo zavři issue. Disagreements se použijí jako prompt-tuning signal pro další iteraci.');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entry — `npm run pipeline:monthly-spotcheck -- --month=2026-04`
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const monthArg = args.find((a) => a.startsWith('--month='))?.split('=')[1];
  if (!monthArg) {
    console.error('Usage: pipeline:monthly-spotcheck --month=YYYY-MM');
    process.exit(2);
  }
  const result = await generateMonthlySpotcheck({ month: monthArg });
  // Print body to stdout — workflow pipes this to `gh issue create --body-file -`.
  process.stdout.write(result.issueBody);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
