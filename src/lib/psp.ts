import { type RawArticle } from './types';

/**
 * Scraper for Poslanecká sněmovna (psp.cz). PSP doesn't expose an RSS feed —
 * we parse the přehled schůzí (`/sqw/ischuze.sqw?o=N`) which lists every
 * session of the current volební období with start/end dates and status.
 *
 * Iter 1: one RawArticle per session ending or adjourned within the target
 * window. The signal we care about is governance dysfunction — sessions
 * marked "Přerušeno" (adjourned) often indicate political deadlock, walkouts,
 * or unresolved procedural disputes worth flagging to the classifier.
 *
 * Iter 2 (deferred): drill into each schůze for projednávané tisky,
 * detect §90 odst.2 (urgent procedure) usage, override of presidential vetoes.
 */

const PSP_BASE = 'https://www.psp.cz';
const PSP_OUTLET = 'Poslanecká sněmovna';
const ISCHUZE_URL = `${PSP_BASE}/sqw/ischuze.sqw`;
const DEFAULT_PERIOD = 10; // 10. volební období = od listopadu 2025

const CZECH_MONTHS: Record<string, number> = {
  ledna: 1,
  února: 2,
  března: 3,
  dubna: 4,
  května: 5,
  června: 6,
  července: 7,
  srpna: 8,
  září: 9,
  října: 10,
  listopadu: 11,
  prosince: 12,
};

export interface PspSchuze {
  /** Session number within the volební období (1, 2, ...). */
  number: number;
  /** Session start date in ISO format (YYYY-MM-DD), if parseable. */
  startDate?: string;
  /** Session end date in ISO format. Equals startDate for single-day sessions. */
  endDate?: string;
  /** "Přerušeno" if adjourned, undefined if normally completed. */
  status?: string;
  /** Permalink to the session detail page. */
  url: string;
  /** Raw date string from PSP (e.g. "(3. - 5. listopadu 2025)"), kept for debugging. */
  rawDate: string;
}

export interface PspClientOptions {
  /** For tests: inject a fetcher returning the raw HTML. */
  fetchHtml?: (url: string) => Promise<string>;
}

export class PspClient {
  private readonly fetchHtml: NonNullable<PspClientOptions['fetchHtml']>;

  constructor(options: PspClientOptions = {}) {
    this.fetchHtml = options.fetchHtml ?? defaultFetchHtml;
  }

  /**
   * Fetches the session listing for the given volební období and returns
   * structured records. Period 10 = od listopadu 2025 (current). Period 9 =
   * 2021–2025, etc. — older periods kept reachable for backfill.
   */
  async listSchuze(period: number = DEFAULT_PERIOD): Promise<PspSchuze[]> {
    const html = await this.fetchHtml(`${ISCHUZE_URL}?o=${period}`);
    return parseSchuzeTable(html);
  }
}

export interface FetchPspSchuzeOptions {
  client?: PspClient;
  period?: number;
  /** Inclusive start of the window (ISO YYYY-MM-DD). */
  fromDate: string;
  /** Inclusive end of the window (ISO YYYY-MM-DD). */
  toDate: string;
}

/**
 * Returns one RawArticle per session that overlaps the [fromDate, toDate]
 * window. A session "overlaps" if its end date is ≥ fromDate and its start
 * date is ≤ toDate. Adjourned sessions with no end date are counted if their
 * start is ≤ toDate (still ongoing as of the window).
 *
 * The classifier downstream decides if the session warrants an event — most
 * weeks PSP just does normal business and nothing rises to severity ≥ 1.
 * "Přerušeno" status is surfaced in the title so the classifier can weigh it.
 */
export async function fetchPspSchuzeAsArticles(
  options: FetchPspSchuzeOptions,
): Promise<RawArticle[]> {
  const client = options.client ?? new PspClient();
  const period = options.period ?? DEFAULT_PERIOD;
  const sessions = await client.listSchuze(period);
  const fetchedAt = new Date().toISOString();
  const from = options.fromDate;
  const to = options.toDate;

  const inWindow = sessions.filter((s) => {
    const start = s.startDate ?? s.endDate;
    if (!start) return false;
    if (start > to) return false;
    // Completed sessions: fire when their end date falls in [from, to].
    // Adjourned/ongoing sessions (no endDate): fire only once — when they
    // start. Otherwise a session "Přerušeno" since November would re-fire
    // every week for months, flooding the classifier with the same URL.
    if (s.endDate) return s.endDate >= from;
    return start >= from;
  });

  return inWindow.map((s) => schuzeToArticle(s, period, fetchedAt));
}

function schuzeToArticle(s: PspSchuze, period: number, fetchedAt: string): RawArticle {
  const dateRange = formatDateRange(s);
  const statusLabel = s.status ? ` — ${s.status}` : '';
  const title = `${s.number}. schůze Poslanecké sněmovny ${dateRange}${statusLabel}`;
  const summaryParts = [
    `${s.number}. schůze Poslanecké sněmovny v ${period}. volebním období ${dateRange}.`,
    s.status === 'Přerušeno'
      ? 'Schůze byla přerušena — projednávání nebylo dokončeno v plánovaném termínu.'
      : 'Schůze proběhla v plánovaném termínu.',
    'Detail jednání včetně schváleného pořadu a hlasování je dostupný na webu Poslanecké sněmovny.',
  ];
  return {
    url: `${PSP_BASE}${s.url}`,
    title,
    outlet: PSP_OUTLET,
    fetched_at: fetchedAt,
    // Use end date as the canonical "published_at" — that's when the session
    // resolved (or was last updated for ongoing). Falls back to start.
    published_at: toIsoDateTime(s.endDate ?? s.startDate),
    summary: summaryParts.join(' '),
  };
}

function formatDateRange(s: PspSchuze): string {
  if (!s.startDate) return s.rawDate;
  if (!s.endDate || s.endDate === s.startDate) return `(${s.startDate})`;
  return `(${s.startDate} – ${s.endDate})`;
}

function toIsoDateTime(date: string | undefined): string | undefined {
  if (!date) return undefined;
  return `${date}T00:00:00.000Z`;
}

/**
 * Parses the schůze table from the PSP HTML page. The page uses
 * `<table class="light-table session-list approved-session-list">` with one
 * `<tr>` per session. Each row has:
 *   col 1: link with session number  →  "1. schůze"
 *   col 2: parenthesised date range  →  "(3. - 5. listopadu 2025)"
 *   col 3: status span              →  "Přerušeno" (only if adjourned)
 *
 * PSP serves windows-1250 encoded HTML — caller must decode to UTF-8 before
 * passing the string here.
 */
export function parseSchuzeTable(html: string): PspSchuze[] {
  const sessions: PspSchuze[] = [];
  // Extract rows from the session-list table only — defensive against PSP
  // adding other tables on the page.
  const tableMatch = html.match(
    /<table[^>]*class="[^"]*session-list[^"]*"[^>]*>([\s\S]*?)<\/table>/,
  );
  if (!tableMatch) return sessions;
  const tableInner = tableMatch[1];
  if (!tableInner) return sessions;

  const rows = [...tableInner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  for (const rowMatch of rows) {
    const row = rowMatch[1] ?? '';
    const linkMatch = row.match(/<a[^>]*href="([^"]+)"[^>]*>(?:<[^>]*>)*\s*(\d+)\.\s*(?:&nbsp;|\s)*schůze/);
    if (!linkMatch) continue;
    const url = linkMatch[1] ?? '';
    const numberStr = linkMatch[2] ?? '';
    const number = Number.parseInt(numberStr, 10);
    if (!Number.isFinite(number)) continue;

    // Date range is in the next <td> after the col-number — pull all <td>s and
    // pick by position for robustness.
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
      cleanText(m[1] ?? ''),
    );
    const rawDate = cells[1] ?? '';
    const status = cells[2] ?? undefined;
    const dates = parseCzechDateRange(rawDate);

    sessions.push({
      number,
      startDate: dates.start,
      endDate: dates.end,
      status: status && status.length > 0 ? status : undefined,
      url,
      rawDate,
    });
  }
  return sessions;
}

/**
 * Parses Czech date ranges seen on the PSP session list.
 *
 * Patterns in the wild:
 *   "(3. - 5. listopadu 2025)"      → start 2025-11-03, end 2025-11-05
 *   "(13. listopadu 2025)"          → start = end = 2025-11-13
 *   "(od 26. listopadu 2025)"       → start 2025-11-26, no end (ongoing)
 *   "(13. - 30. ledna 2026)"        → start 2026-01-13, end 2026-01-30
 *   "(31. ledna - 4. února 2026)"   → cross-month: start 2026-01-31, end 2026-02-04
 */
export function parseCzechDateRange(raw: string): { start?: string; end?: string } {
  const text = raw.replace(/[()]/g, '').trim();
  if (!text) return {};

  // Handle "od DD. month YYYY" — open-ended
  const openMatch = text.match(
    /^od\s+(\d{1,2})\.\s+([a-zěščřžýáíéůúďťň]+)\s+(\d{4})/i,
  );
  if (openMatch) {
    const day = Number.parseInt(openMatch[1] ?? '0', 10);
    const month = CZECH_MONTHS[openMatch[2]?.toLowerCase() ?? ''] ?? 0;
    const year = Number.parseInt(openMatch[3] ?? '0', 10);
    const iso = toIso(year, month, day);
    return iso ? { start: iso } : {};
  }

  // Cross-month range: "DD. month1 - DD. month2 YYYY"
  const crossMatch = text.match(
    /^(\d{1,2})\.\s+([a-zěščřžýáíéůúďťň]+)\s*[–-]\s*(\d{1,2})\.\s+([a-zěščřžýáíéůúďťň]+)\s+(\d{4})$/i,
  );
  if (crossMatch) {
    const startDay = Number.parseInt(crossMatch[1] ?? '0', 10);
    const startMonth = CZECH_MONTHS[crossMatch[2]?.toLowerCase() ?? ''] ?? 0;
    const endDay = Number.parseInt(crossMatch[3] ?? '0', 10);
    const endMonth = CZECH_MONTHS[crossMatch[4]?.toLowerCase() ?? ''] ?? 0;
    const year = Number.parseInt(crossMatch[5] ?? '0', 10);
    return {
      start: toIso(year, startMonth, startDay),
      // If the range crosses a year boundary (Dec→Jan), PSP would print
      // the year on each part — this branch only handles same-year crossing.
      end: toIso(year, endMonth, endDay),
    };
  }

  // Same-month range: "DD. - DD. month YYYY"
  const sameMonthMatch = text.match(
    /^(\d{1,2})\.\s*[–-]\s*(\d{1,2})\.\s+([a-zěščřžýáíéůúďťň]+)\s+(\d{4})$/i,
  );
  if (sameMonthMatch) {
    const startDay = Number.parseInt(sameMonthMatch[1] ?? '0', 10);
    const endDay = Number.parseInt(sameMonthMatch[2] ?? '0', 10);
    const month = CZECH_MONTHS[sameMonthMatch[3]?.toLowerCase() ?? ''] ?? 0;
    const year = Number.parseInt(sameMonthMatch[4] ?? '0', 10);
    return {
      start: toIso(year, month, startDay),
      end: toIso(year, month, endDay),
    };
  }

  // Single date: "DD. month YYYY"
  const singleMatch = text.match(/^(\d{1,2})\.\s+([a-zěščřžýáíéůúďťň]+)\s+(\d{4})$/i);
  if (singleMatch) {
    const day = Number.parseInt(singleMatch[1] ?? '0', 10);
    const month = CZECH_MONTHS[singleMatch[2]?.toLowerCase() ?? ''] ?? 0;
    const year = Number.parseInt(singleMatch[3] ?? '0', 10);
    const iso = toIso(year, month, day);
    return iso ? { start: iso, end: iso } : {};
  }

  return {};
}

function toIso(year: number, month: number, day: number): string | undefined {
  if (!year || !month || !day) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function defaultFetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'democracy-index-cz/0.1 (+https://github.com)' },
  });
  if (!res.ok) {
    throw new Error(`PSP fetch failed: HTTP ${res.status} for ${url}`);
  }
  // PSP serves windows-1250 — decode explicitly.
  const buf = await res.arrayBuffer();
  return new TextDecoder('windows-1250').decode(buf);
}
