import { type RawArticle } from './types';

/**
 * Client for hlidacstatu.cz API v2 ([swagger](https://api.hlidacstatu.cz/swagger/index.html)).
 * License key (free tier) sent via `Authorization: Token <key>` header.
 *
 * Surfaces:
 * - **sponzoring** (iter 1): donations to political parties. Fan-out across
 *   POLITICAL_PARTIES, threshold ≥ 100 000 Kč, last 30 days.
 * - **smlouvy s issues** (iter 2): contracts where Hlídač's anomaly enhancers
 *   flagged the record (e.g. published late, missing fields, suspicious value).
 *   Fan-out across WATCHLIST_ENTITIES.
 * - **dotace** (iter 2): subsidies received by watchlist entities. Filtered by
 *   Hlídač's `modifiedDate` to surface newly-visible records.
 */

const API_BASE = 'https://api.hlidacstatu.cz/api/v2';
const HLIDAC_OUTLET = 'Hlídač státu';
const HLIDAC_HOMEPAGE = 'https://www.hlidacstatu.cz';

/**
 * Major Czech political parties with active parliamentary representation,
 * keyed by IČO. Used to fan out sponzoring queries.
 *
 * Source: veřejný rejstřík (justice.cz). When a new party rises, add here.
 * If a party renames or merges, both the old IČO (for history) and new IČO
 * stay listed — historical donations won't move.
 */
export const POLITICAL_PARTIES: Record<string, string> = {
  '71443339': 'ANO 2011',
  '16192656': 'ODS',
  '00442704': 'KDU-ČSL',
  '71339728': 'TOP 09',
  '22875327': 'SPD',
  '26673908': 'STAN',
  '71339698': 'Česká pirátská strana',
  '22878660': 'Motoristé sobě',
  '00409171': 'ČSSD',
};

/**
 * Politicky-citlivé entity sledované pro smlouvy/dotace (corruption pillar).
 * Každý záznam: IČO → display name. Fan-out probíhá per IČO; rozšíření
 * watchlistu je čistě konfigurační záležitost (commit do tohoto souboru).
 *
 * AGROFERT je kanonický CZ příklad konflikt-zájmů (Babiš). MAFRA je vydavatelství,
 * které Babiš v 2013-2023 vlastnil přes AGROFERT (relevantní pro media pillar).
 *
 * Před přidáním nové entity vždy ověř IČO proti ARES nebo Hlídač /firmy/{ico}
 * endpointu — IČO Penta Investments např. v ARES neexistuje (firma je zaregistrovaná
 * v Lichtenštejnsku), takže by se watchlist musel rozšířit o jejich CZ dceřinky
 * jednotlivě.
 */
export const WATCHLIST_ENTITIES: Record<string, string> = {
  '26185610': 'AGROFERT, a.s.',
  '45313351': 'MAFRA, a.s.',
};

export interface HlidacClientOptions {
  apiKey?: string;
  /** For tests: inject custom fetcher. Receives URL + headers, returns raw text. */
  fetchJson?: (url: string, headers: Record<string, string>) => Promise<unknown>;
}

interface SponzoringRow {
  nameIdDarce?: string | null;
  jmenoDarce?: string | null;
  prijmeniDarce?: string | null;
  daumNarozeniDarce?: string | null;
  icoDarce?: string | null;
  icoPrijemce: string;
  typDaru?: string | null;
  hodnotaDaru: number;
  popis?: string | null;
  darovanoDne: string;
}

interface SmlouvaIssue {
  issueTypeId?: number;
  title?: string;
  description?: string;
  importance?: string;
}

interface SmlouvaRow {
  identifikator?: { idSmlouvy?: string; idVerze?: string };
  id?: string;
  cisloSmlouvy?: string;
  predmet?: string;
  hodnotaVcetneDph?: number | null;
  hodnotaBezDph?: number | null;
  calculatedPriceWithVATinCZK?: number | null;
  casZverejneni?: string;
  datumUzavreni?: string;
  issues?: SmlouvaIssue[];
  platce?: { nazev?: string; ico?: string };
  prijemce?: Array<{ nazev?: string; ico?: string }>;
  odkaz?: string;
}

interface SmlouvaSearchResponse {
  total?: number;
  page?: number;
  results?: SmlouvaRow[];
}

interface DotaceRecipient {
  ico?: string;
  name?: string;
  displayName?: string;
}

interface DotaceRow {
  id?: string;
  recipient?: DotaceRecipient;
  payedAmount?: number | null;
  subsidyAmount?: number | null;
  assumedAmount?: number | null;
  projectName?: string;
  projectCode?: string;
  programName?: string;
  subsidyProvider?: string;
  subsidyProviderIco?: string;
  approvedYear?: number;
  processedDate?: string;
  modifiedDate?: string;
}

interface DotaceSearchResponse {
  total?: number;
  page?: number;
  results?: DotaceRow[];
}

export class HlidacClient {
  private readonly apiKey: string;
  private readonly fetchJson: NonNullable<HlidacClientOptions['fetchJson']>;

  constructor(options: HlidacClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env['HLIDAC_API_KEY'];
    if (!apiKey) {
      throw new Error('HLIDAC_API_KEY is not set. Set it in .env (free key from hlidacstatu.cz/api).');
    }
    this.apiKey = apiKey;
    this.fetchJson = options.fetchJson ?? defaultFetchJson;
  }

  /**
   * Returns all sponzoring records (donations) received by the party with
   * the given IČO. Hlídač returns full history, no pagination params; client
   * filters by date downstream.
   */
  async getSponzoring(icoStrany: string): Promise<SponzoringRow[]> {
    const url = `${API_BASE}/sponzoring/${encodeURIComponent(icoStrany)}`;
    const data = (await this.fetchJson(url, {
      Authorization: `Token ${this.apiKey}`,
    })) as SponzoringRow[];
    return Array.isArray(data) ? data : [];
  }

  /**
   * Searches the smlouvy (Registr smluv) dataset. `dotaz` follows Hlídač's
   * full-text query syntax — `ico:N` filters by recipient/payer IČO, plain
   * strings do name search, page param `strana` is 1-based. Returns the
   * first page (default 10 items); for watchlist queries that's enough since
   * we only care about the most recent.
   */
  async searchSmlouvy(dotaz: string, page = 1): Promise<SmlouvaRow[]> {
    const url = `${API_BASE}/smlouvy/hledat?dotaz=${encodeURIComponent(dotaz)}&strana=${page}`;
    const data = (await this.fetchJson(url, {
      Authorization: `Token ${this.apiKey}`,
    })) as SmlouvaSearchResponse;
    return data.results ?? [];
  }

  /**
   * Searches the dotace dataset. Same query syntax as smlouvy. Most useful
   * with `ico:N` to anchor on a specific recipient.
   */
  async searchDotace(dotaz: string, page = 1): Promise<DotaceRow[]> {
    const url = `${API_BASE}/dotace/hledat?dotaz=${encodeURIComponent(dotaz)}&strana=${page}`;
    const data = (await this.fetchJson(url, {
      Authorization: `Token ${this.apiKey}`,
    })) as DotaceSearchResponse;
    return data.results ?? [];
  }
}

export interface FetchSponzoringOptions {
  client?: HlidacClient;
  /** Inclusive start date (ISO YYYY-MM-DD) for the donation window. */
  fromDate: string;
  /** Inclusive end date (ISO YYYY-MM-DD). */
  toDate: string;
  /** Donations below this CZK threshold are dropped (noise filter). Default 100 000 Kč. */
  minHodnotaCzk?: number;
  /** Override the party list (used in tests). */
  parties?: Record<string, string>;
}

const DEFAULT_MIN_HODNOTA = 100_000;

/**
 * Fetches sponzoring (party donations) for the given window and returns
 * them as RawArticle records ready to feed to the pre-filter / extractor.
 *
 * Filters:
 * - Donation date in [fromDate, toDate] inclusive.
 * - Donation value ≥ minHodnotaCzk (default 100 000 Kč) — drops the long tail
 *   of small individual contributions that aren't index-worthy.
 *
 * Each donation maps to one RawArticle. Text is synthesized in Czech with
 * structural data; the classifier decides whether it's a democracy event.
 */
export async function fetchPartyDonationsAsArticles(
  options: FetchSponzoringOptions,
): Promise<RawArticle[]> {
  const client = options.client ?? new HlidacClient();
  const parties = options.parties ?? POLITICAL_PARTIES;
  const minHodnota = options.minHodnotaCzk ?? DEFAULT_MIN_HODNOTA;
  const from = new Date(options.fromDate);
  const to = new Date(options.toDate);
  const fetchedAt = new Date().toISOString();

  const articles: RawArticle[] = [];
  for (const [ico, partyName] of Object.entries(parties)) {
    let rows: SponzoringRow[];
    try {
      rows = await client.getSponzoring(ico);
    } catch {
      // Fail soft: one party fetch error doesn't sink the whole adapter.
      continue;
    }
    for (const row of rows) {
      const date = new Date(row.darovanoDne);
      if (Number.isNaN(date.getTime())) continue;
      if (date < from || date > to) continue;
      if (row.hodnotaDaru < minHodnota) continue;
      articles.push(rowToArticle(row, ico, partyName, fetchedAt));
    }
  }
  return articles;
}

function rowToArticle(
  row: SponzoringRow,
  icoStrany: string,
  partyName: string,
  fetchedAt: string,
): RawArticle {
  const donor = formatDonor(row);
  const dateOnly = row.darovanoDne.slice(0, 10);
  const amount = formatAmountCzk(row.hodnotaDaru);
  const typLabel = formatTypDaru(row.typDaru);
  const title = `${partyName} obdržela ${typLabel} ${amount} od ${donor}`;
  const summary = [
    `${partyName} (IČO ${icoStrany}) přijala ${typLabel} v hodnotě ${amount} Kč od ${donor} dne ${dateOnly}.`,
    row.popis ? `Popis: ${row.popis}` : '',
    'Údaje pocházejí z databáze sponzoringu Hlídače státu (zdroj: výroční finanční zprávy stran v rejstříku stran a hnutí).',
  ]
    .filter(Boolean)
    .join(' ');

  // Hlídač nemá per-záznam URL; linkujeme na profil strany s donations výpisem.
  const url = `${HLIDAC_HOMEPAGE}/subjekt/${icoStrany}`;

  return {
    url,
    title,
    outlet: HLIDAC_OUTLET,
    fetched_at: fetchedAt,
    published_at: row.darovanoDne,
    summary,
  };
}

function formatDonor(row: SponzoringRow): string {
  const namedPerson = [row.jmenoDarce, row.prijmeniDarce].filter(Boolean).join(' ').trim();
  if (namedPerson) {
    return row.daumNarozeniDarce
      ? `${namedPerson} (nar. ${row.daumNarozeniDarce.slice(0, 10)})`
      : namedPerson;
  }
  if (row.icoDarce) return `IČO ${row.icoDarce}`;
  return 'neuvedený dárce';
}

function formatAmountCzk(value: number): string {
  // Intl `cs-CZ` separuje skupiny tisíců non-breaking space ().
  // Pro JSON-friendly output a snadné testování normalizujeme na ASCII space.
  return Math.round(value).toLocaleString('cs-CZ').replace(/\s/g, ' ');
}

function formatTypDaru(typ: string | null | undefined): string {
  switch (typ) {
    case 'FinancniDar':
      return 'finanční dar';
    case 'NepenezniDar':
    case 'NefinancniDar':
      return 'nefinanční dar';
    case 'BezuplatnePlneni':
      return 'bezúplatné plnění';
    case 'Ostatni':
      return 'jiné plnění';
    default:
      return typ ? `dar (${typ})` : 'dar';
  }
}

async function defaultFetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Hlídač státu fetch failed: HTTP ${res.status} for ${url}`);
  }
  return res.json();
}

// ============================================================
// Smlouvy s issues (corruption pillar)
// ============================================================

export interface FetchWatchlistSmlouvyOptions {
  client?: HlidacClient;
  /** Inclusive start date (ISO YYYY-MM-DD) — filters by `casZverejneni`. */
  fromDate: string;
  /** Inclusive end date (ISO YYYY-MM-DD). */
  toDate: string;
  /** Override the watchlist (used in tests). */
  watchlist?: Record<string, string>;
  /** Cap per-entity result count to prevent runaway. Default 10. */
  maxPerEntity?: number;
}

const DEFAULT_MAX_PER_ENTITY = 10;

/**
 * Fetches contracts from the Registr smluv that involve watchlist entities
 * AND were flagged with at least one Hlídač anomaly (`issues.length > 0`),
 * published within [fromDate, toDate]. Each contract becomes one RawArticle.
 *
 * Why filter on `issues.length > 0`: AGROFERT alone has 731 contracts on
 * record. Most are routine; the anomaly-flagged subset is the corruption
 * pillar signal worth surfacing to the classifier.
 */
export async function fetchWatchlistSmlouvyAsArticles(
  options: FetchWatchlistSmlouvyOptions,
): Promise<RawArticle[]> {
  const client = options.client ?? new HlidacClient();
  const watchlist = options.watchlist ?? WATCHLIST_ENTITIES;
  const cap = options.maxPerEntity ?? DEFAULT_MAX_PER_ENTITY;
  const from = options.fromDate;
  const to = options.toDate;
  const fetchedAt = new Date().toISOString();

  const articles: RawArticle[] = [];
  for (const [ico, displayName] of Object.entries(watchlist)) {
    let rows: SmlouvaRow[];
    try {
      rows = await client.searchSmlouvy(`ico:${ico}`);
    } catch {
      continue;
    }
    let kept = 0;
    for (const row of rows) {
      if (kept >= cap) break;
      if (!row.issues || row.issues.length === 0) continue;
      const publishedDate = row.casZverejneni?.slice(0, 10);
      if (!publishedDate) continue;
      if (publishedDate < from || publishedDate > to) continue;
      articles.push(smlouvaToArticle(row, ico, displayName, fetchedAt));
      kept += 1;
    }
  }
  return articles;
}

function smlouvaToArticle(
  row: SmlouvaRow,
  watchIco: string,
  watchName: string,
  fetchedAt: string,
): RawArticle {
  const idVerze = row.identifikator?.idVerze ?? row.id ?? '';
  const url = idVerze
    ? `${HLIDAC_HOMEPAGE}/Smlouva/${idVerze}`
    : `${HLIDAC_HOMEPAGE}/subjekt/${watchIco}`;
  const amount =
    row.hodnotaVcetneDph ?? row.calculatedPriceWithVATinCZK ?? row.hodnotaBezDph;
  const amountStr = amount ? `${formatAmountCzk(amount)} Kč` : 'neuvedená hodnota';
  const counterparty =
    row.platce?.nazev ??
    row.prijemce?.find((p) => p.ico !== watchIco)?.nazev ??
    'protistranou';
  const issueTitles = (row.issues ?? [])
    .map((i) => i.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, 3);
  const issuesLabel = issueTitles.length > 0 ? issueTitles.join('; ') : 'flagované anomálie';
  const dateOnly = row.casZverejneni?.slice(0, 10) ?? '';
  const subject = row.predmet ? ` Předmět: ${row.predmet.slice(0, 200)}.` : '';

  const title = `${watchName}: smlouva s ${counterparty} (${amountStr}) — ${issuesLabel}`;
  const summary = [
    `${watchName} (IČO ${watchIco}) má v Registru smluv smlouvu č. ${row.cisloSmlouvy ?? '–'} se subjektem "${counterparty}" v hodnotě ${amountStr}, zveřejněnou ${dateOnly}.`,
    `Hlídač státu označil tuto smlouvu těmito anomáliemi: ${issuesLabel}.`,
    subject,
    'Údaje pocházejí z Registru smluv (zákon č. 340/2015 Sb.) přes Hlídač státu.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    url,
    title,
    outlet: HLIDAC_OUTLET,
    fetched_at: fetchedAt,
    published_at: row.casZverejneni,
    summary,
  };
}

// ============================================================
// Dotace pro watchlist (corruption pillar)
// ============================================================

export interface FetchWatchlistDotaceOptions {
  client?: HlidacClient;
  /** Inclusive start date — filters by Hlídač `modifiedDate`. */
  fromDate: string;
  /** Inclusive end date. */
  toDate: string;
  watchlist?: Record<string, string>;
  maxPerEntity?: number;
  /** Drop subsidies below this CZK amount. Default 100 000 Kč (matches sponzoring noise floor). */
  minAmountCzk?: number;
}

const DEFAULT_DOTACE_MIN_AMOUNT = 100_000;

/**
 * Fetches dotace (state subsidies) received by watchlist entities, filtered
 * by Hlídač's `modifiedDate` falling within the window. Note: subsidies are
 * often historical (approved years earlier) but newly indexed by Hlídač —
 * `modifiedDate` surfaces this "newly visible" cohort, which is the
 * transparency-relevant signal.
 */
export async function fetchWatchlistDotaceAsArticles(
  options: FetchWatchlistDotaceOptions,
): Promise<RawArticle[]> {
  const client = options.client ?? new HlidacClient();
  const watchlist = options.watchlist ?? WATCHLIST_ENTITIES;
  const cap = options.maxPerEntity ?? DEFAULT_MAX_PER_ENTITY;
  const minAmount = options.minAmountCzk ?? DEFAULT_DOTACE_MIN_AMOUNT;
  const from = options.fromDate;
  const to = options.toDate;
  const fetchedAt = new Date().toISOString();

  const articles: RawArticle[] = [];
  for (const [ico, displayName] of Object.entries(watchlist)) {
    let rows: DotaceRow[];
    try {
      rows = await client.searchDotace(`ico:${ico}`);
    } catch {
      continue;
    }
    let kept = 0;
    for (const row of rows) {
      if (kept >= cap) break;
      const modified = row.modifiedDate?.slice(0, 10) ?? row.processedDate?.slice(0, 10);
      if (!modified) continue;
      if (modified < from || modified > to) continue;
      const amount = row.payedAmount ?? row.subsidyAmount ?? row.assumedAmount ?? 0;
      if (amount < minAmount) continue;
      articles.push(dotaceToArticle(row, ico, displayName, fetchedAt));
      kept += 1;
    }
  }
  return articles;
}

function dotaceToArticle(
  row: DotaceRow,
  watchIco: string,
  watchName: string,
  fetchedAt: string,
): RawArticle {
  const url = row.id
    ? `${HLIDAC_HOMEPAGE}/dotace/detail/${encodeURIComponent(row.id)}`
    : `${HLIDAC_HOMEPAGE}/subjekt/${watchIco}`;
  const amount = row.payedAmount ?? row.subsidyAmount ?? row.assumedAmount;
  const amountStr = amount ? `${formatAmountCzk(amount)} Kč` : 'neuvedená částka';
  const provider = row.subsidyProvider ?? 'neuvedený poskytovatel';
  const project = row.projectName ?? row.projectCode ?? 'projekt bez názvu';
  const year = row.approvedYear ?? '?';

  const title = `${watchName}: dotace ${amountStr} od ${provider} (${year}) — ${project}`;
  const summary = [
    `${watchName} (IČO ${watchIco}) je příjemcem dotace v hodnotě ${amountStr} od poskytovatele ${provider}, schválené v roce ${year}.`,
    `Projekt: "${project}".`,
    `Záznam aktualizován v databázi Hlídače státu ${row.modifiedDate?.slice(0, 10) ?? '–'}.`,
    'Zdroj: registry CEDR / DotInfo / DeMinimis přes Hlídač státu.',
  ].join(' ');

  return {
    url,
    title,
    outlet: HLIDAC_OUTLET,
    fetched_at: fetchedAt,
    published_at: row.modifiedDate ?? row.processedDate,
    summary,
  };
}
