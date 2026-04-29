import { describe, expect, it, vi } from 'vitest';
import {
  fetchPspSchuzeAsArticles,
  parseCzechDateRange,
  parseSchuzeTable,
  PspClient,
} from '../src/lib/psp';

describe('parseCzechDateRange', () => {
  it('parses same-month range', () => {
    expect(parseCzechDateRange('(3. - 5. listopadu 2025)')).toEqual({
      start: '2025-11-03',
      end: '2025-11-05',
    });
  });

  it('parses single-day session', () => {
    expect(parseCzechDateRange('(13. února 2026)')).toEqual({
      start: '2026-02-13',
      end: '2026-02-13',
    });
  });

  it('parses open-ended adjourned session', () => {
    expect(parseCzechDateRange('(od 26. listopadu 2025)')).toEqual({
      start: '2025-11-26',
    });
  });

  it('parses cross-month range', () => {
    expect(parseCzechDateRange('(31. ledna - 4. února 2026)')).toEqual({
      start: '2026-01-31',
      end: '2026-02-04',
    });
  });

  it('handles en-dash separator', () => {
    expect(parseCzechDateRange('(13. – 30. ledna 2026)')).toEqual({
      start: '2026-01-13',
      end: '2026-01-30',
    });
  });

  it('returns empty object on unparseable input', () => {
    expect(parseCzechDateRange('garbage')).toEqual({});
  });
});

describe('parseSchuzeTable', () => {
  const SAMPLE_HTML = `
    <table class="light-table session-list approved-session-list"><tbody>
      <tr class="completed">
        <td class="col-number"><a href="/sqw/ischuze.sqw?o=10&s=1"><b>1.&nbsp;schůze</b></a></td>
        <td>(3. - 5.&nbsp;listopadu&nbsp;2025)</td>
        <td class="col-status"></td>
      </tr>
      <tr class="adjourned">
        <td class="col-number"><a href="/sqw/ischuze.sqw?o=10&s=3"><b>3.&nbsp;schůze</b></a></td>
        <td>(od 26.&nbsp;listopadu&nbsp;2025)</td>
        <td class="col-status"><span class="status">Přerušeno</span></td>
      </tr>
      <tr class="completed">
        <td class="col-number"><a href="/sqw/ischuze.sqw?o=10&s=14"><b>14.&nbsp;schůze</b></a></td>
        <td>(14. - 24.&nbsp;dubna&nbsp;2026)</td>
        <td class="col-status"></td>
      </tr>
    </tbody></table>
  `;

  it('extracts all sessions with correct numbers, dates, status', () => {
    const sessions = parseSchuzeTable(SAMPLE_HTML);
    expect(sessions).toHaveLength(3);
    expect(sessions[0]).toMatchObject({
      number: 1,
      startDate: '2025-11-03',
      endDate: '2025-11-05',
      status: undefined,
      url: '/sqw/ischuze.sqw?o=10&s=1',
    });
    expect(sessions[1]).toMatchObject({
      number: 3,
      startDate: '2025-11-26',
      endDate: undefined,
      status: 'Přerušeno',
    });
    expect(sessions[2]).toMatchObject({
      number: 14,
      startDate: '2026-04-14',
      endDate: '2026-04-24',
    });
  });

  it('returns empty array if no session-list table is present', () => {
    expect(parseSchuzeTable('<html><body>no table here</body></html>')).toEqual([]);
  });

  it('skips rows without a session number link (defensive against PSP layout changes)', () => {
    const html = `
      <table class="light-table session-list"><tbody>
        <tr><td>Header row, no link</td></tr>
        <tr class="completed">
          <td class="col-number"><a href="/sqw/ischuze.sqw?o=10&s=5"><b>5.&nbsp;schůze</b></a></td>
          <td>(13. - 30.&nbsp;ledna&nbsp;2026)</td>
          <td></td>
        </tr>
      </tbody></table>
    `;
    expect(parseSchuzeTable(html)).toHaveLength(1);
  });
});

describe('fetchPspSchuzeAsArticles', () => {
  const HTML = `
    <table class="light-table session-list"><tbody>
      <tr class="completed">
        <td class="col-number"><a href="/sqw/ischuze.sqw?o=10&s=1"><b>1.&nbsp;schůze</b></a></td>
        <td>(3. - 5.&nbsp;listopadu&nbsp;2025)</td>
        <td></td>
      </tr>
      <tr class="adjourned">
        <td class="col-number"><a href="/sqw/ischuze.sqw?o=10&s=3"><b>3.&nbsp;schůze</b></a></td>
        <td>(od 26.&nbsp;listopadu&nbsp;2025)</td>
        <td><span class="status">Přerušeno</span></td>
      </tr>
      <tr class="completed">
        <td class="col-number"><a href="/sqw/ischuze.sqw?o=10&s=14"><b>14.&nbsp;schůze</b></a></td>
        <td>(14. - 24.&nbsp;dubna&nbsp;2026)</td>
        <td></td>
      </tr>
    </tbody></table>
  `;

  it('returns articles only for sessions overlapping the window', async () => {
    const fetchHtml = vi.fn().mockResolvedValue(HTML);
    const client = new PspClient({ fetchHtml });
    const articles = await fetchPspSchuzeAsArticles({
      client,
      fromDate: '2026-04-14',
      toDate: '2026-04-28',
    });
    expect(articles).toHaveLength(1);
    expect(articles[0]?.title).toContain('14. schůze');
    expect(articles[0]?.published_at).toBe('2026-04-24T00:00:00.000Z');
    expect(articles[0]?.url).toBe('https://www.psp.cz/sqw/ischuze.sqw?o=10&s=14');
  });

  it('fires adjourned session exactly once on the week it starts (not on later windows)', async () => {
    const fetchHtml = vi.fn().mockResolvedValue(HTML);
    const client = new PspClient({ fetchHtml });
    // Window covering schůze 3 start (2025-11-26): should include it.
    const onStartWeek = await fetchPspSchuzeAsArticles({
      client,
      fromDate: '2025-11-24',
      toDate: '2025-11-30',
    });
    expect(onStartWeek.find((a) => a.title.includes('3. schůze'))).toBeDefined();

    // Later window (Dec): the still-Přerušeno schůze 3 should NOT re-fire.
    // Otherwise we'd flood the classifier with the same URL every week.
    const laterWeek = await fetchPspSchuzeAsArticles({
      client,
      fromDate: '2025-12-01',
      toDate: '2025-12-31',
    });
    expect(laterWeek).toHaveLength(0);
  });

  it('annotates "Přerušeno" status in title for governance signal', async () => {
    const fetchHtml = vi.fn().mockResolvedValue(HTML);
    const client = new PspClient({ fetchHtml });
    const articles = await fetchPspSchuzeAsArticles({
      client,
      fromDate: '2025-11-01',
      toDate: '2025-11-30',
    });
    const adjourned = articles.find((a) => a.title.includes('3. schůze'));
    expect(adjourned?.title).toContain('Přerušeno');
    expect(adjourned?.summary).toContain('přerušena');
  });

  it('returns empty array when no session overlaps the window', async () => {
    const fetchHtml = vi.fn().mockResolvedValue(HTML);
    const client = new PspClient({ fetchHtml });
    const articles = await fetchPspSchuzeAsArticles({
      client,
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
    });
    expect(articles).toEqual([]);
  });
});
