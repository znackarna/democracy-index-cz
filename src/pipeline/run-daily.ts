import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { capSeverityBySourceCount, type CapAdjustment } from './cap-severity';
import { dedupeEvents } from './dedupe';
import { extractEvents } from './extract-events';
import { fetchAllSources } from './fetch-sources';
import { preFilter } from './pre-filter';
import { validateMany } from './validate';
import {
  type Event,
  type IsoWeek,
  type RawArticle,
} from '../lib/types';

/**
 * Daily orchestrator (varianta B z 2026-04-29 architektonického rozhodnutí).
 *
 * Spouští se každý den v 06:00 UTC z `weekly-pipeline.yml`. Cíl: zachytit
 * rychle se točící RSS feedy (iROZHLAS retence ~1 den, HN ~3 dny) — týdenní
 * cron je při této retenci ztrácel ~30-60 % týdenního obsahu.
 *
 * Klíčová optimization: URL-dedupe vůči existujícím events PŘED pre-filterem.
 * Diky tomu denní run klasifikuje jen ~10-20 nových článků/den (vs ~500
 * týdně), bez 7× růstu Sonnet nákladů.
 *
 * Tento modul NEPOČÍTÁ skóre, NEPÍŠE report ani NEDETEKUJE anomálie. Tyhle
 * agregace dělá `aggregate-weekly.ts`, který orchestrátor ve workflow spouští
 * jen pondělí pro uplynulý uzavřený týden.
 */

const DEFAULT_PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export interface RunDailyOptions {
  /** Reference week pro classifier prompt context (typicky aktuální ISO týden). */
  week: IsoWeek;
  /** Path override (test injection). */
  projectRoot?: string;
  /** Subset zdrojů (default: všechny RSS + implementované adaptery). */
  sourceIds?: readonly string[];
  /** Override `now` pro deterministické testy. */
  now?: Date;
  /** Sources YAML config path override (test injection). */
  configPath?: string;
  /** Test injection pro fetchText. */
  fetchText?: (url: string) => Promise<string>;
  /** Skip LLM (plumbing test mód). */
  skipLlm?: boolean;
}

export interface PerWeekResult {
  week: IsoWeek;
  /** Počet nových events napsaných do souboru pro tento týden. */
  added: number;
  /** Počet existujících events v souboru před mergem. */
  existed: number;
  /** Počet events po dedupe (existing + new merged). */
  total: number;
  /** Severity cap adjustments aplikované na nové events. */
  capped: CapAdjustment[];
}

export interface RunDailyResult {
  fetched: number;
  /** Počet article URL přeskočených URL-dedupe gateu (= už klasifikované). */
  alreadyClassified: number;
  /** Počet article předaných pre-filteru po URL-dedupe. */
  newArticles: number;
  preFiltered: number;
  perSource: Array<{ id: string; type: string; count: number; error?: string }>;
  perWeek: PerWeekResult[];
  /** Týdny dotčené tímto runem (kde se zapsal soubor). */
  touchedWeeks: IsoWeek[];
}

/**
 * Daily pipeline:
 * 1. Fetch all sources
 * 2. URL-dedupe vs. existující events v dotčených týdnech (current + prev)
 * 3. Pre-filter (Haiku) jen new články
 * 4. Group new candidates by ISO week of published_at
 * 5. Per week: classify (Sonnet) → cap → merge s existujícími events → write
 *
 * Idempotency: URL-dedupe gate zaručuje, že re-run stejného dne neklasifikuje
 * stejný článek znovu. Pokud Sonnet generuje dva články popisující stejný
 * incident napříč dny, dedupeEvents je sloučí při mergi (cross-day dedupe).
 */
export async function runDaily(options: RunDailyOptions): Promise<RunDailyResult> {
  const root = options.projectRoot ?? DEFAULT_PROJECT_ROOT;
  const now = options.now ?? new Date();
  const eventsDir = path.join(root, 'data', 'events');
  await mkdir(eventsDir, { recursive: true });

  // 1. Fetch
  const fetchOpts = {
    ...(options.configPath ? { configPath: options.configPath } : {}),
    ...(options.sourceIds ? { sourceIds: options.sourceIds } : {}),
    ...(options.fetchText ? { fetchText: options.fetchText } : {}),
  };
  const fetchResult = await fetchAllSources(fetchOpts);
  const fetched = fetchResult.articles;

  // 2. URL-dedupe — lokálně načti všechny existující events napříč všemi
  // týdny v okolí (poslední 4 týdny stačí pro pokrytí RSS retence + buffer
  // pro late-arriving articles).
  const seenUrls = await loadSeenUrls(eventsDir, now);
  const newArticles = fetched.filter((a) => !seenUrls.has(a.url.toLowerCase()));
  const alreadyClassified = fetched.length - newArticles.length;

  // 3. Pre-filter — Haiku gate. Short-circuit při 0 nových článcích, abychom
  // zbytečně nevolali Anthropic ani s prázdným polem (test mocks).
  const preFiltered =
    options.skipLlm || newArticles.length === 0 ? [] : await preFilter(newArticles);

  // 4. Group pre-filtered articles by ISO week of published_at. Drives
  // per-week classification (correct event IDs + correct file routing).
  const byWeek = groupByWeekOfPublished(preFiltered);

  // 5. Per week: classify, cap, merge, write.
  // Per-week try/catch — když jeden týden selže (typicky deterministický
  // Sonnet JSON parse fail nebo síťový blip), ostatní pokračují. Tímto se
  // run-daily nikdy nezhroutí celý kvůli jednomu týdnu, takže se vždycky
  // commitne to, co se stihlo, a recompute timeline zůstane konzistentní.
  const perWeek: PerWeekResult[] = [];
  const touchedWeeks: IsoWeek[] = [];
  for (const [week, articlesForWeek] of byWeek) {
    if (articlesForWeek.length === 0) continue;
    try {
      const eventsPath = path.join(eventsDir, `${week}.json`);
      const existing = await readEventsFile(eventsPath);
      const startSeq = nextSeqForWeek(existing, week);

      const candidates = options.skipLlm
        ? []
        : await extractEvents(articlesForWeek, {
            week,
            now,
            startSeq,
          });

      const { valid: validEvents } = await validateMany<Event>('event', candidates);
      const { events: cappedEvents, capped } = capSeverityBySourceCount(validEvents);

      // Cross-day dedupe: merge new candidates with existing events. dedupeEvents
      // iterates in order, takes earlier IDs as canonical → existing events drží
      // své ID, nové se buď přidají, nebo se sloučí jako další zdroj existující.
      const merged = dedupeEvents([...existing, ...cappedEvents]).events;

      await writeFile(eventsPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
      perWeek.push({
        week,
        added: cappedEvents.length,
        existed: existing.length,
        total: merged.length,
        capped,
      });
      touchedWeeks.push(week);
    } catch (err) {
      console.warn(
        `  ✗ week ${week} FAILED, skipping: ${(err as Error).message.slice(0, 200)}`,
      );
    }
  }

  return {
    fetched: fetched.length,
    alreadyClassified,
    newArticles: newArticles.length,
    preFiltered: preFiltered.length,
    perSource: fetchResult.perSource,
    perWeek,
    touchedWeeks,
  };
}

/**
 * Načte URL všech zdrojů ze všech events souborů z posledních ~4 týdnů.
 * 4 týdny = horní hranice typické RSS retence (HN má ~3 dny, ÚS až ~30 dní;
 * ÚS je low-volume, false positive overlap je tam zanedbatelný).
 *
 * Lowercase normalizace pro robustnost vůči drobným URL variantám
 * (utm_source params apod. necháme bytí — pro v1 přijatelný miss-rate).
 */
async function loadSeenUrls(eventsDir: string, now: Date): Promise<Set<string>> {
  const recentWeeks = recentIsoWeeks(now, 4);
  const seen = new Set<string>();
  for (const week of recentWeeks) {
    const file = path.join(eventsDir, `${week}.json`);
    const events = await readEventsFile(file);
    for (const e of events) {
      for (const s of e.sources) {
        seen.add(s.url.toLowerCase());
      }
    }
  }
  return seen;
}

/**
 * Vrací seznam ISO týdnů od (now - count*7d) po now včetně, sorted desc.
 * Použito jen jako klíč pro filesystem lookup, ne pro datovou logiku.
 */
function recentIsoWeeks(now: Date, count: number): IsoWeek[] {
  const out: IsoWeek[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = new Date(now.getTime() - i * 7 * 86_400_000);
    out.push(isoWeekLabel(t) as IsoWeek);
  }
  return out;
}

async function readEventsFile(file: string): Promise<Event[]> {
  try {
    const raw = await readFile(file, 'utf-8');
    const parsed = JSON.parse(raw) as Event[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Nejvyšší použité NNN v ID `YYYY-Wxx-NNN` pro daný týden + 1.
 * Bezpečné i když existing je prázdné (vrátí 1).
 */
function nextSeqForWeek(existing: readonly Event[], week: IsoWeek): number {
  const prefix = `${week}-`;
  let max = 0;
  for (const e of existing) {
    if (!e.id.startsWith(prefix)) continue;
    const seq = Number.parseInt(e.id.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return max + 1;
}

function groupByWeekOfPublished<T extends RawArticle>(articles: readonly T[]): Map<IsoWeek, T[]> {
  const out = new Map<IsoWeek, T[]>();
  for (const a of articles) {
    const dateStr = a.published_at?.slice(0, 10) ?? a.fetched_at.slice(0, 10);
    const week = isoWeekLabelFromDateStr(dateStr) as IsoWeek;
    const list = out.get(week) ?? [];
    list.push(a);
    out.set(week, list);
  }
  return out;
}

function isoWeekLabelFromDateStr(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) throw new Error(`Invalid date: ${dateStr}`);
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return isoWeekLabel(date);
}

function isoWeekLabel(date: Date): string {
  const dayNum = date.getUTCDay() || 7;
  const thursday = new Date(date.getTime() + (4 - dayNum) * 86_400_000);
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// CLI entry — `npm run pipeline:daily -- --week=2026-W17`
// ---------------------------------------------------------------------------

interface CliArgs {
  week?: string;
  sources?: string;
  skipLlm?: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const out: CliArgs = {};
  for (const arg of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) {
      const rawKey = m[1] ?? '';
      const value = m[2] ?? '';
      const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as keyof CliArgs;
      if (key === 'skipLlm') (out[key] as boolean) = value === 'true';
      else (out[key] as string) = value;
    } else if (arg === '--skip-llm') {
      out.skipLlm = true;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.week) {
    console.error('Usage: pipeline:daily --week=2026-W17 [--sources=id1,id2,...] [--skip-llm]');
    process.exit(2);
  }
  const sourceIds = args.sources
    ? args.sources.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const opts: RunDailyOptions = {
    week: args.week as IsoWeek,
    ...(sourceIds ? { sourceIds } : {}),
    ...(args.skipLlm ? { skipLlm: true } : {}),
  };

  console.log(`▶ running daily pipeline (reference week ${args.week})`);
  const result = await runDaily(opts);

  console.log('');
  console.log(`fetched:               ${result.fetched} articles`);
  console.log(`already classified:    ${result.alreadyClassified} (URL-dedupe drop)`);
  console.log(`new articles:          ${result.newArticles}`);
  console.log(`pre-filtered:          ${result.preFiltered}`);
  console.log('');
  console.log('per-week:');
  for (const w of result.perWeek) {
    console.log(
      `  ${w.week}: existing=${w.existed}, +new=${w.added}, total=${w.total}` +
        (w.capped.length > 0 ? `, capped=${w.capped.length}` : ''),
    );
  }
  console.log('per-source:');
  for (const s of result.perSource) {
    const tag = s.error ? `ERROR: ${s.error}` : `${s.count} items`;
    console.log(`  ${s.id.padEnd(20)} ${s.type.padEnd(6)} ${tag}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.stack) console.error(err.stack);
    process.exit(1);
  });
}
