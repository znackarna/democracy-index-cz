import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { z } from 'zod';
import { dedupeArticles, fetchRssFeed, type FeedFetchOptions } from '../lib/feeds';
import {
  fetchPartyDonationsAsArticles,
  fetchWatchlistDotaceAsArticles,
  fetchWatchlistSmlouvyAsArticles,
} from '../lib/hlidac';
import { fetchPspSchuzeAsArticles } from '../lib/psp';
import { type RawArticle } from '../lib/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, '..', '..', 'config', 'sources.yaml');

const SourceTypeSchema = z.enum(['rss', 'api', 'html']);
const SourceCategorySchema = z.enum(['czech_media', 'open_data', 'watchdog', 'international']);

const SourceConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: SourceCategorySchema,
  type: SourceTypeSchema,
  url: z.string().url(),
  homepage: z.string().url().optional(),
  notes: z.string().optional(),
});
export type SourceConfig = z.infer<typeof SourceConfigSchema>;

const SourcesFileSchema = z.object({
  version: z.literal(1),
  sources: z.array(SourceConfigSchema).min(1),
});

export interface FetchOptions extends FeedFetchOptions {
  /** Override the path to the sources YAML config. */
  configPath?: string;
  /**
   * Skip non-RSS sources (api, html). Defaults to true. Implemented adapters
   * (currently `hlidac-statu`) ignore this flag and run anyway when their
   * source id is present.
   */
  skipNonRss?: boolean;
  /** Restrict to source ids matching this set (default: all sources in config). */
  sourceIds?: readonly string[];
  /**
   * Date window for adapters that take one (e.g. Hlídač sponzoring).
   * Defaults to last 30 days ending today.
   */
  windowDays?: number;
}

export interface FetchResult {
  /** Deduplicated raw articles, ready for pre-filter. */
  articles: RawArticle[];
  /** Per-source breakdown for logging — what came from where, including failures. */
  perSource: Array<{ id: string; type: string; count: number; error?: string }>;
}

export async function loadSources(configPath = DEFAULT_CONFIG_PATH): Promise<SourceConfig[]> {
  const raw = await readFile(configPath, 'utf-8');
  const parsed = yaml.load(raw);
  const validated = SourcesFileSchema.parse(parsed);
  return validated.sources;
}

/**
 * Fetch all configured sources and merge into a deduplicated article list.
 *
 * Per-source failures are logged in `perSource` but do not abort the whole
 * run — one broken feed must not stop the weekly pipeline.
 */
export async function fetchAllSources(options: FetchOptions = {}): Promise<FetchResult> {
  const skipNonRss = options.skipNonRss ?? true;
  const allSources = await loadSources(options.configPath);
  const allowed = options.sourceIds ? new Set(options.sourceIds) : null;
  const sources = allowed ? allSources.filter((s) => allowed.has(s.id)) : allSources;
  if (allowed && sources.length === 0) {
    throw new Error(`No sources matched filter: ${[...allowed].join(',')}`);
  }

  const perSource: FetchResult['perSource'] = [];
  const all: RawArticle[] = [];
  const windowDays = options.windowDays ?? 30;

  for (const source of sources) {
    if (source.type === 'rss') {
      try {
        const items = await fetchRssFeed(source.url, source.name, options);
        all.push(...items);
        perSource.push({ id: source.id, type: source.type, count: items.length });
      } catch (err) {
        perSource.push({
          id: source.id,
          type: source.type,
          count: 0,
          error: (err as Error).message,
        });
      }
      continue;
    }

    // Implemented non-RSS adapters dispatch by source id.
    const today = new Date();
    const from = new Date(today.getTime() - windowDays * 86_400_000);
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = today.toISOString().slice(0, 10);

    if (source.id === 'hlidac-statu') {
      try {
        const items = await fetchPartyDonationsAsArticles({
          fromDate: fromIso,
          toDate: toIso,
        });
        all.push(...items);
        perSource.push({ id: source.id, type: source.type, count: items.length });
      } catch (err) {
        perSource.push({
          id: source.id,
          type: source.type,
          count: 0,
          error: (err as Error).message,
        });
      }
      continue;
    }

    if (source.id === 'hlidac-smlouvy') {
      try {
        const items = await fetchWatchlistSmlouvyAsArticles({
          fromDate: fromIso,
          toDate: toIso,
        });
        all.push(...items);
        perSource.push({ id: source.id, type: source.type, count: items.length });
      } catch (err) {
        perSource.push({
          id: source.id,
          type: source.type,
          count: 0,
          error: (err as Error).message,
        });
      }
      continue;
    }

    if (source.id === 'hlidac-dotace') {
      try {
        const items = await fetchWatchlistDotaceAsArticles({
          fromDate: fromIso,
          toDate: toIso,
        });
        all.push(...items);
        perSource.push({ id: source.id, type: source.type, count: items.length });
      } catch (err) {
        perSource.push({
          id: source.id,
          type: source.type,
          count: 0,
          error: (err as Error).message,
        });
      }
      continue;
    }

    if (source.id === 'psp-cz') {
      try {
        const items = await fetchPspSchuzeAsArticles({
          fromDate: fromIso,
          toDate: toIso,
        });
        all.push(...items);
        perSource.push({ id: source.id, type: source.type, count: items.length });
      } catch (err) {
        perSource.push({
          id: source.id,
          type: source.type,
          count: 0,
          error: (err as Error).message,
        });
      }
      continue;
    }

    // No adapter for this id yet.
    if (skipNonRss) {
      perSource.push({
        id: source.id,
        type: source.type,
        count: 0,
        error: 'skipped (adapter not implemented)',
      });
    } else {
      perSource.push({
        id: source.id,
        type: source.type,
        count: 0,
        error: 'unsupported type',
      });
    }
  }

  return {
    articles: dedupeArticles(all),
    perSource,
  };
}
