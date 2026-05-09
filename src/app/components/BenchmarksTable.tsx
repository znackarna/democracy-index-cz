import type { StructuralBaseline } from '@/lib/types';
import { getMessages, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
  baseline: StructuralBaseline;
}

const ROW_ORDER = ['V-Dem', 'EIU', 'FH-FitW', 'RSF', 'TI-CPI', 'WJP'] as const;

const INDEX_LABEL: Record<string, string> = {
  'V-Dem': 'V-Dem LDI',
  EIU: 'EIU Democracy Index',
  'FH-FitW': 'Freedom House',
  RSF: 'RSF Press Freedom',
  'TI-CPI': 'Transparency CPI',
  WJP: 'WJP Rule of Law',
};

const STATIC_RANK: Record<string, string> = {
  'V-Dem': '28 / 179',
  EIU: '23 / 167',
  'FH-FitW': '—',
  RSF: '10 / 180',
  'TI-CPI': '46 / 180',
  WJP: '20 / 142',
};

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
 * Two layouts in one component:
 *   - **Desktop (≥ md)**: 5-column grid with hairline dividers — Index ·
 *     Hodnota · Δ · Pozice · Klasifikace.
 *   - **Mobile (< md)**: each row is a card-like block — index name on
 *     its own line at full width (so "Transparency CPI" doesn't wrap
 *     to "Transp/arency"), then a 3-cell row underneath with Hodnota,
 *     Δ, Pozice. Classification dropped on mobile (low-info per inch).
 */
export function BenchmarksTable({ locale, baseline }: Props) {
  const t = getMessages(locale);
  const T = t.benchmarks;

  const fmtValue = (key: string, raw: number): string => {
    if (key === 'V-Dem') return raw.toFixed(2);
    if (key === 'EIU') return raw.toFixed(2);
    if (key === 'FH-FitW') return `${raw} / 100`;
    if (key === 'TI-CPI') return `${raw} / 100`;
    if (key === 'WJP') return raw.toFixed(2);
    return raw.toFixed(1);
  };

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

        {/* Desktop header row */}
        <div className="hidden grid-cols-12 border-y border-black md:grid">
          <DesktopHeader span={3} label={T.headers.index} />
          <DesktopHeader span={2} label={T.headers.value} />
          <DesktopHeader span={2} label={T.headers.delta} />
          <DesktopHeader span={2} label={T.headers.rank} />
          <DesktopHeader span={3} label={T.headers.classification} last />
        </div>

        {/* Rows */}
        <div className="border-t border-black md:border-t-0">
          {rows.map((row) => (
            <div key={row.key}>
              {/* Mobile: stacked. Index name on its own line, values below. */}
              <div className="flex flex-col border-b border-black/10 md:hidden">
                <div className="flex items-baseline justify-between gap-3 px-1 pb-2 pt-4">
                  <div className="text-[15px] font-medium tracking-tight">
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
                  </div>
                  {row.year !== null && (
                    <span className="font-mono num text-[11px] text-black/45">
                      '{String(row.year).slice(-2)}
                    </span>
                  )}
                </div>
                {row.classification !== '—' && (
                  <div className="px-1 pb-2 text-[12px] text-black/55">{row.classification}</div>
                )}
                <div className="grid grid-cols-3 border-t border-black/10 text-[13px]">
                  <MobileStatCell label={T.headers.value} value={row.value} />
                  <MobileStatCell label={T.headers.delta} value={row.delta} />
                  <MobileStatCell label={T.headers.rank} value={row.rank} />
                </div>
              </div>

              {/* Desktop: original 5-col grid */}
              <div className="hidden grid-cols-12 border-b border-black/10 md:grid">
                <DesktopCell span={3} className="text-[14px]">
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
                </DesktopCell>
                <DesktopCell span={2} className="font-mono num text-[14px]">
                  {row.value}
                </DesktopCell>
                <DesktopCell span={2} className="font-mono num text-[14px]">
                  {row.delta}
                </DesktopCell>
                <DesktopCell span={2} className="font-mono num text-[14px]">
                  {row.rank}
                </DesktopCell>
                <DesktopCell span={3} className="text-[14px] text-black/65" last>
                  {row.classification}
                </DesktopCell>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Tailwind doesn't generate classes from dynamic strings, so we map the
// span numbers we actually use to their static class.
const SPAN_CLASS: Record<number, string> = {
  2: 'col-span-2',
  3: 'col-span-3',
};

function DesktopHeader({
  span,
  label,
  last,
}: {
  span: number;
  label: string;
  last?: boolean;
}) {
  return (
    <div
      className={`p-5 text-[11px] uppercase tracking-[0.18em] text-black/50 ${SPAN_CLASS[span]} ${
        last ? '' : 'border-r border-black/10'
      }`}
    >
      {label}
    </div>
  );
}

function DesktopCell({
  span,
  className = '',
  last,
  children,
}: {
  span: number;
  className?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-5 ${SPAN_CLASS[span]} ${last ? '' : 'border-r border-black/10'} ${className}`}>
      {children}
    </div>
  );
}

function MobileStatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 border-r border-black/10 p-3 last:border-r-0">
      <span className="text-[9px] uppercase tracking-[0.18em] text-black/45">{label}</span>
      <span className="font-mono num text-[14px] text-black">{value}</span>
    </div>
  );
}
