import Parser from 'rss-parser';
import { type RawArticle } from './types';

export interface FeedFetchOptions {
  /** Optional custom fetcher — used in tests to inject canned XML. */
  fetchText?: (url: string) => Promise<string>;
  /** Defaults to 15 seconds. */
  timeoutMs?: number;
}

const parser = new Parser({
  timeout: 15_000,
  customFields: {
    item: ['contentSnippet', 'content:encoded', 'description'],
  },
});

/**
 * Fetch and parse an RSS or Atom feed into normalized RawArticle records.
 *
 * `outletName` is attached to every returned article so we don't lose source
 * provenance when feeds from different outlets are merged downstream.
 */
export async function fetchRssFeed(
  url: string,
  outletName: string,
  options: FeedFetchOptions = {},
): Promise<RawArticle[]> {
  const fetchedAt = new Date().toISOString();
  const xml = await (options.fetchText ?? defaultFetchText)(url, options.timeoutMs ?? 15_000);
  const feed = await parser.parseString(xml);

  const articles: RawArticle[] = [];
  for (const item of feed.items) {
    const itemUrl = item.link?.trim();
    const title = item.title?.trim();
    if (!itemUrl || !title) continue;

    const summary = pickSummary(item as unknown as Record<string, unknown>);
    const article: RawArticle = {
      url: itemUrl,
      title,
      outlet: outletName,
      fetched_at: fetchedAt,
      ...(item.isoDate ? { published_at: item.isoDate } : {}),
      ...(summary ? { summary } : {}),
    };
    articles.push(article);
  }
  return articles;
}

function pickSummary(item: Record<string, unknown>): string | undefined {
  const candidates = [item['contentSnippet'], item['description'], item['content:encoded']];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim().slice(0, 1000);
    }
  }
  return undefined;
}

async function defaultFetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'democracy-index-cz/0.1 (+https://github.com/znackarna/personal-democracy)' },
    });
    if (!res.ok) {
      throw new Error(`Feed fetch failed for ${url}: HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Deduplicate articles by URL (case-insensitive). When duplicates exist, the
 * first occurrence wins — caller decides ordering (usually newest-first per
 * outlet, then concatenated).
 */
export function dedupeArticles(articles: readonly RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  const result: RawArticle[] = [];
  for (const a of articles) {
    const key = a.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(a);
  }
  return result;
}
