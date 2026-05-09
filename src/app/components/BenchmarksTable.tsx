import type { StructuralBaseline } from '@/lib/types';
import { getMessages, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
  baseline: StructuralBaseline;
}

/**
 * Order in which external indices are displayed on the home benchmarks
 * table. Hand-curated to match the design (V-Dem first, then EIU, then
 * FH, then single-dimension indices).
 */
const ROW_ORDER = ['V-Dem', 'EIU', 'FH-FitW', 'RSF', 'TI-CPI', 'WJP'] as const;

/** Display labels per index (always shown — not localised). */
const INDEX_LABEL: Record<string, string> = {
  'V-Dem': 'V-Dem LDI',
  EIU: 'EIU Democracy Index',
  'FH-FitW': 'Freedom House',
  RSF: 'RSF Press Freedom',
  'TI-CPI': 'Transparency CPI',
  WJP: 'WJP Rule of Law',
};

/** Approximate ranks. Hand-curated from each index's published 2024-2025
 *  reports. Ratings change rarely so a static map is fine; revise quarterly
 *  alongside structural baseline updates. */
const STATIC_RANK: Record<string, string> = {
  'V-Dem': '28 / 179',
  EIU: '23 / 167',
  'FH-FitW': '—',
  RSF: '10 / 180',
  'TI-CPI': '46 / 180',
  WJP: '20 / 142',
};

/** Long-running deltas published by each index for 2014→2025 (or whatever
 *  their latest comparable horizon is). Pulled from each index's site;
 *  refresh quarterly. */
const STATIC_TEN_YEAR_DELTA: Record<string, string> = {
  'V-Dem': '−0.05',
  EIU: '−0.13',
  'FH-FitW': '−3',
  RSF: '−4.1',
  'TI-CPI': '+5',
  WJP: '+0.02',
};

/**
 * Editorial benchmarks table per redesign-v2.
 *
 * Reads current values from the active structural baseline (2026-Q3 at the
 * time of this redesign) so the table never drifts out of sync with the
 * weighted overall used by the rest of the site.
 */
export function BenchmarksTable({ locale, baseline }: Props) {
  const t = getMessages(locale);
  const T = t.benchmarks;

  // Index value formatter per index's native scale.
  const fmtValue = (key: string, raw: number): string => {
    if (key === 'V-Dem') return raw.toFixed(2);
    if (key === 'EIU') return raw.toFixed(2);
    if (key === 'FH-FitW') return `${raw} / 100`;
    if (key === 'TI-CPI') return `${raw} / 100`;
    if (key === 'WJP') return raw.toFixed(2);
    return raw.toFixed(1);
  };

  // Build display rows by joining the canonical order with the latest
  // baseline's source list. Indices not present in baseline.sources still
  // render (with — for value) so the table layout stays consistent.
  const sourceMap = new Map<string, { value: number; year: number; url: string }>();
  for (const s of baseline.sources) {
    if (!sourceMap.has(s.index)) {
      sourceMap.set(s.index, { value: s.value, year: s.year, url: s.url });
    }
  }

  const rows = ROW_ORDER.map((key) => {
    const src = sourceMap.get(key);
    return {
      key,
      label: INDEX_LABEL[key] ?? key,
      year: src?.year ?? null,
      url: src?.url ?? null,
      value: src ? fmtValue(key, src.value) : '—',
      delta: STATIC_TEN_YEAR_DELTA[key] ?? '—',
      rank: STATIC_RANK[key] ?? '—',
      classification: (T.classifications as Record<string, string>)[key] ?? '—',
    };
  });

  return (
    <section id="srovnani" className="border-b border-black">
      <div className="mx-auto max-w-editorial px-6 py-14 md:px-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">{T.eyebrow}</div>
            <h2
              className="mt-2 text-3xl font-medium tracking-tight md:text-4xl"
              style={{ textWrap: 'balance' }}
            >
              {T.title}
            </h2>
          </div>
          <div className="hidden max-w-[36ch] text-right text-[12px] leading-relaxed text-black/55 md:block">
            {T.intro}
          </div>
        </div>

        <div className="grid grid-cols-12 border-y border-black">
          <HeaderCell span={3} label={T.headers.index} />
          <HeaderCell span={2} label={T.headers.value} />
          <HeaderCell span={2} label={T.headers.delta} />
          <HeaderCell span={2} label={T.headers.rank} />
          <HeaderCell span={3} label={T.headers.classification} hideOnMobile />
        </div>

        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-12 border-b border-black/10">
            <Cell span={3} className="text-[13px] sm:text-[14px]">
              {row.url ? (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uhover"
                >
                  {row.label}
                </a>
              ) : (
                row.label
              )}
              {row.year !== null && (
                <span className="ml-2 font-mono num text-[11px] text-black/45">
                  '{String(row.year).slice(-2)}
                </span>
              )}
            </Cell>
            <Cell span={2} className="font-mono num text-[14px]">
              {row.value}
            </Cell>
            <Cell span={2} className="font-mono num text-[14px]">
              {row.delta}
            </Cell>
            <Cell span={2} className="font-mono num text-[14px]">
              {row.rank}
            </Cell>
            <Cell span={3} className="text-[14px] text-black/65" hideOnMobile>
              {row.classification}
            </Cell>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeaderCell({
  span,
  label,
  hideOnMobile,
}: {
  span: number;
  label: string;
  hideOnMobile?: boolean;
}) {
  return (
    <div
      className={`p-5 text-[11px] uppercase tracking-[0.18em] text-black/50 ${
        span === 3
          ? 'col-span-3'
          : span === 2
            ? 'col-span-3 md:col-span-2'
            : `col-span-${span}`
      } ${hideOnMobile ? 'hidden md:block' : ''} ${
        // No right border on the last column.
        hideOnMobile ? '' : 'border-r border-black/10'
      }`}
    >
      {label}
    </div>
  );
}

function Cell({
  span,
  children,
  hideOnMobile,
  className = '',
}: {
  span: number;
  children: React.ReactNode;
  hideOnMobile?: boolean;
  className?: string;
}) {
  const spanClass =
    span === 3
      ? 'col-span-3'
      : span === 2
        ? 'col-span-3 md:col-span-2'
        : `col-span-${span}`;
  return (
    <div
      className={`p-5 ${spanClass} ${hideOnMobile ? 'hidden md:block' : ''} ${
        hideOnMobile ? '' : 'border-r border-black/10'
      } ${className}`}
    >
      {children}
    </div>
  );
}
