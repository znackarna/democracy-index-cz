import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPartyDonationsAsArticles,
  fetchWatchlistDotaceAsArticles,
  fetchWatchlistSmlouvyAsArticles,
  HlidacClient,
} from '../src/lib/hlidac';

afterEach(() => {
  delete process.env['HLIDAC_API_KEY'];
});

describe('HlidacClient', () => {
  it('throws if HLIDAC_API_KEY is not set', () => {
    expect(() => new HlidacClient()).toThrow(/HLIDAC_API_KEY/);
  });

  it('passes Authorization: Token header to fetcher', async () => {
    const fetchJson = vi.fn().mockResolvedValue([]);
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    await client.getSponzoring('71443339');
    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringContaining('/sponzoring/71443339'),
      { Authorization: 'Token test-key' },
    );
  });

  it('handles non-array API response gracefully (returns [])', async () => {
    const fetchJson = vi.fn().mockResolvedValue({ error: 'unknown' });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    expect(await client.getSponzoring('71443339')).toEqual([]);
  });
});

describe('fetchPartyDonationsAsArticles', () => {
  it('returns articles for donations within the date window above threshold', async () => {
    const fetchJson = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/sponzoring/71443339')) {
        return [
          {
            icoDarce: '00011835',
            icoPrijemce: '71443339',
            typDaru: 'FinancniDar',
            hodnotaDaru: 1_000_000,
            darovanoDne: '2025-06-15T00:00:00',
          },
          {
            icoDarce: '00011836',
            icoPrijemce: '71443339',
            typDaru: 'FinancniDar',
            hodnotaDaru: 50_000, // below threshold
            darovanoDne: '2025-06-16T00:00:00',
          },
          {
            icoDarce: '00011837',
            icoPrijemce: '71443339',
            typDaru: 'FinancniDar',
            hodnotaDaru: 500_000,
            darovanoDne: '2024-12-15T00:00:00', // outside window
          },
        ];
      }
      return [];
    });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchPartyDonationsAsArticles({
      client,
      fromDate: '2025-06-01',
      toDate: '2025-06-30',
      parties: { '71443339': 'ANO 2011' },
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]?.title).toContain('ANO 2011');
    expect(articles[0]?.title).toContain('1 000 000');
    expect(articles[0]?.title).toContain('IČO 00011835');
    expect(articles[0]?.outlet).toBe('Hlídač státu');
    expect(articles[0]?.url).toContain('71443339');
    expect(articles[0]?.published_at).toBe('2025-06-15T00:00:00');
  });

  it('formats donor name when present', async () => {
    const fetchJson = vi.fn().mockResolvedValue([
      {
        jmenoDarce: 'Jan',
        prijmeniDarce: 'Novák',
        daumNarozeniDarce: '1970-05-12T00:00:00',
        icoDarce: null,
        icoPrijemce: '71443339',
        typDaru: 'FinancniDar',
        hodnotaDaru: 200_000,
        darovanoDne: '2025-06-15T00:00:00',
      },
    ]);
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchPartyDonationsAsArticles({
      client,
      fromDate: '2025-06-01',
      toDate: '2025-06-30',
      parties: { '71443339': 'ANO 2011' },
    });
    expect(articles[0]?.title).toContain('Jan Novák');
    expect(articles[0]?.summary).toContain('Jan Novák');
    expect(articles[0]?.summary).toContain('1970-05-12');
  });

  it('respects custom minHodnotaCzk threshold', async () => {
    const fetchJson = vi.fn().mockResolvedValue([
      {
        icoDarce: '00011835',
        icoPrijemce: '71443339',
        typDaru: 'FinancniDar',
        hodnotaDaru: 75_000,
        darovanoDne: '2025-06-15T00:00:00',
      },
    ]);
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const above = await fetchPartyDonationsAsArticles({
      client,
      fromDate: '2025-06-01',
      toDate: '2025-06-30',
      minHodnotaCzk: 50_000,
      parties: { '71443339': 'ANO 2011' },
    });
    const below = await fetchPartyDonationsAsArticles({
      client,
      fromDate: '2025-06-01',
      toDate: '2025-06-30',
      minHodnotaCzk: 100_000,
      parties: { '71443339': 'ANO 2011' },
    });
    expect(above).toHaveLength(1);
    expect(below).toHaveLength(0);
  });

  it('soft-fails when one party fetch errors (others continue)', async () => {
    const fetchJson = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/sponzoring/71443339')) {
        throw new Error('HTTP 500');
      }
      return [
        {
          icoDarce: '00099999',
          icoPrijemce: '16192656',
          typDaru: 'FinancniDar',
          hodnotaDaru: 500_000,
          darovanoDne: '2025-06-15T00:00:00',
        },
      ];
    });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchPartyDonationsAsArticles({
      client,
      fromDate: '2025-06-01',
      toDate: '2025-06-30',
      parties: { '71443339': 'ANO 2011', '16192656': 'ODS' },
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]?.title).toContain('ODS');
  });
});

describe('fetchWatchlistSmlouvyAsArticles', () => {
  const SAMPLE_AGROFERT = '26185610';

  it('returns only contracts with non-empty issues array, within window', async () => {
    const fetchJson = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/smlouvy/hledat')) {
        return {
          total: 3,
          page: 1,
          results: [
            {
              identifikator: { idVerze: 'V1' },
              cisloSmlouvy: 'A-1',
              hodnotaVcetneDph: 500_000,
              casZverejneni: '2026-04-15T10:00:00+02:00',
              issues: [{ title: 'Nulová hodnota smlouvy' }],
              prijemce: [{ nazev: 'Nemocnice X', ico: '99999999' }],
            },
            {
              identifikator: { idVerze: 'V2' },
              cisloSmlouvy: 'A-2',
              hodnotaVcetneDph: 100_000,
              casZverejneni: '2026-04-20T10:00:00+02:00',
              issues: [], // no anomaly — must be dropped
              prijemce: [{ nazev: 'Někdo jiný' }],
            },
            {
              identifikator: { idVerze: 'V3' },
              cisloSmlouvy: 'A-3',
              hodnotaVcetneDph: 200_000,
              casZverejneni: '2025-12-01T10:00:00+02:00', // outside window
              issues: [{ title: 'Pozdní zveřejnění' }],
              prijemce: [{ nazev: 'Stará protistrana' }],
            },
          ],
        };
      }
      return { total: 0, results: [] };
    });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchWatchlistSmlouvyAsArticles({
      client,
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
      watchlist: { [SAMPLE_AGROFERT]: 'AGROFERT, a.s.' },
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]?.title).toContain('AGROFERT');
    expect(articles[0]?.title).toContain('Nulová hodnota');
    expect(articles[0]?.title).toContain('Nemocnice X');
    expect(articles[0]?.url).toContain('/Smlouva/V1');
  });

  it('respects maxPerEntity cap', async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      total: 50,
      page: 1,
      results: Array.from({ length: 25 }, (_, i) => ({
        identifikator: { idVerze: `V${i}` },
        cisloSmlouvy: `C-${i}`,
        hodnotaVcetneDph: 100_000,
        casZverejneni: '2026-04-15T10:00:00+02:00',
        issues: [{ title: 'Anomálie' }],
        prijemce: [{ nazev: 'X' }],
      })),
    });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchWatchlistSmlouvyAsArticles({
      client,
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
      watchlist: { [SAMPLE_AGROFERT]: 'AGROFERT, a.s.' },
      maxPerEntity: 3,
    });
    expect(articles).toHaveLength(3);
  });

  it('soft-fails when one entity errors (others continue)', async () => {
    const fetchJson = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes(`ico%3A${SAMPLE_AGROFERT}`)) {
        throw new Error('HTTP 500');
      }
      return {
        total: 1,
        page: 1,
        results: [
          {
            identifikator: { idVerze: 'V1' },
            cisloSmlouvy: 'M-1',
            hodnotaVcetneDph: 250_000,
            casZverejneni: '2026-04-15T10:00:00+02:00',
            issues: [{ title: 'Nečitelnost smlouvy' }],
            prijemce: [{ nazev: 'Y' }],
          },
        ],
      };
    });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchWatchlistSmlouvyAsArticles({
      client,
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
      watchlist: { [SAMPLE_AGROFERT]: 'AGROFERT', '45313351': 'MAFRA' },
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]?.title).toContain('MAFRA');
  });
});

describe('fetchWatchlistDotaceAsArticles', () => {
  it('filters by modifiedDate window and minAmount threshold', async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      total: 4,
      page: 1,
      results: [
        {
          id: 'D1',
          recipient: { ico: '26185610', name: 'AGROFERT' },
          payedAmount: 500_000,
          subsidyProvider: 'MZe',
          projectName: 'Projekt A',
          approvedYear: 2024,
          modifiedDate: '2026-04-15T10:00:00+02:00',
        },
        {
          id: 'D2',
          recipient: { ico: '26185610', name: 'AGROFERT' },
          payedAmount: 50_000, // under threshold
          subsidyProvider: 'MZe',
          modifiedDate: '2026-04-15T10:00:00+02:00',
        },
        {
          id: 'D3',
          recipient: { ico: '26185610', name: 'AGROFERT' },
          payedAmount: 500_000,
          subsidyProvider: 'MZe',
          modifiedDate: '2025-01-01T10:00:00+02:00', // outside window
        },
        {
          id: 'D4',
          recipient: { ico: '26185610', name: 'AGROFERT' },
          payedAmount: 200_000,
          subsidyProvider: 'MPSV',
          projectName: 'Projekt D',
          approvedYear: 2023,
          modifiedDate: '2026-04-20T10:00:00+02:00',
        },
      ],
    });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchWatchlistDotaceAsArticles({
      client,
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
      watchlist: { '26185610': 'AGROFERT, a.s.' },
    });
    expect(articles).toHaveLength(2);
    expect(articles.map((a) => a.url)).toEqual([
      expect.stringContaining('D1'),
      expect.stringContaining('D4'),
    ]);
    expect(articles[0]?.title).toContain('500 000');
    expect(articles[0]?.title).toContain('MZe');
  });

  it('falls back to processedDate if modifiedDate missing', async () => {
    const fetchJson = vi.fn().mockResolvedValue({
      total: 1,
      page: 1,
      results: [
        {
          id: 'D5',
          recipient: { ico: '26185610' },
          payedAmount: 300_000,
          processedDate: '2026-04-15T10:00:00+02:00',
        },
      ],
    });
    const client = new HlidacClient({ apiKey: 'test-key', fetchJson });
    const articles = await fetchWatchlistDotaceAsArticles({
      client,
      fromDate: '2026-04-01',
      toDate: '2026-04-30',
      watchlist: { '26185610': 'AGROFERT' },
    });
    expect(articles).toHaveLength(1);
  });
});
