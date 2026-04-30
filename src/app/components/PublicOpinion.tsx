'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { type PollSeries, type TopicalFinding } from '@/lib/types';

interface Props {
  series: readonly PollSeries[];
  topical: readonly TopicalFinding[] | null;
  topicalDescription?: string;
}

// Distinct, accessible colors per institution. Order matches the most common
// CVVM key set; unknown institutions cycle through later colors.
const INSTITUTION_COLORS: Record<string, string> = {
  prezident: '#0f172a',
  vlada: '#dc2626',
  parlament: '#ea580c',
  senat: '#ca8a04',
  starostove: '#16a34a',
  obecni_zastupitelstva: '#0891b2',
  krajska_zastupitelstva: '#7c3aed',
  hejtmani: '#be185d',
};
const FALLBACK_COLORS = ['#475569', '#0369a1', '#15803d', '#a16207', '#9333ea'];

/**
 * Read-only sekce pro veĹ™ejnĂ© mĂ­nÄ›nĂ­. NEVSTUPUJE do skĂłre â€” slouĹľĂ­ jen jako
 * doplĹkovĂ˝ kontext (proÄŤ: methodology/public_opinion.md).
 *
 * Renderuje:
 * 1. Per-source time series chart (typicky CVVM "DĹŻvÄ›ra ĂşstavnĂ­m institucĂ­m")
 * 2. Topical findings cards (ad-hoc nĂˇlezy STEM, Median bez time series)
 *
 * Pokud ĹľĂˇdnĂˇ data nejsou k dispozici (ÄŤerstvĂ˝ repo), vracĂ­ nic â€” homepage
 * ten case oĹˇetĹ™Ă­ podmĂ­nkou.
 */
export function PublicOpinion({ series, topical, topicalDescription }: Props) {
  return (
    <div className="space-y-8">
      {series.map((s) => (
        <PollSeriesChart key={s.source} series={s} />
      ))}
      {topical && topical.length > 0 && (
        <TopicalFindings findings={topical} description={topicalDescription} />
      )}
    </div>
  );
}

function PollSeriesChart({ series }: { series: PollSeries }) {
  // Recharts wants flat rows: one row per period, one column per institution.
  const chartData = series.data.map((d) => {
    const row: Record<string, string | number> = { period: d.period };
    for (const [key, val] of Object.entries(d.values)) {
      row[key] = val;
    }
    return row;
  });

  // Which institutions appear at all in this series? Render lines only for those.
  const presentInstitutions = new Set<string>();
  for (const d of series.data) {
    for (const k of Object.keys(d.values)) presentInstitutions.add(k);
  }
  const institutions = [...presentInstitutions];

  // Detect methodology break â€” if any datapoint is flagged, find its index for
  // a vertical reference line.
  const breakIndex = series.data.findIndex((d) => d.methodology_break);
  const breakPeriod = breakIndex >= 0 ? series.data[breakIndex]?.period : null;
  const breakNote =
    breakIndex >= 0 ? series.data[breakIndex]?.methodology_break_note : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{series.source_label}</h3>
          <p className="text-xs text-slate-500">{series.metric_label}</p>
        </div>
        <a
          href={series.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-500 underline hover:text-slate-900"
        >
          Zdroj â†’
        </a>
      </header>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="period" stroke="#64748b" fontSize={11} />
            <YAxis
              domain={[0, series.scale_max]}
              stroke="#64748b"
              fontSize={11}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}Â %`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                `${value} %`,
                series.institution_labels[name] ?? name,
              ]}
              labelFormatter={(label: string) => {
                const dp = series.data.find((d) => d.period === label);
                return dp ? `${label} â€” ${dp.fieldwork}` : label;
              }}
            />
            <Legend
              formatter={(value: string) => series.institution_labels[value] ?? value}
              wrapperStyle={{ fontSize: '11px' }}
            />
            {breakPeriod && (
              <ReferenceLine
                x={breakPeriod}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{
                  value: 'ZmÄ›na metodiky',
                  position: 'top',
                  fontSize: 10,
                  fill: '#dc2626',
                }}
              />
            )}
            {institutions.map((inst, idx) => {
              const color =
                INSTITUTION_COLORS[inst] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
              return (
                <Line
                  key={inst}
                  type="monotone"
                  dataKey={inst}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {(series.methodology_note || breakNote) && (
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {series.methodology_note}
          {breakNote && (
            <>
              {' '}
              <strong className="text-amber-700">ZmÄ›na metodiky ({breakPeriod}):</strong>{' '}
              {breakNote}
            </>
          )}
        </p>
      )}
    </section>
  );
}

function TopicalFindings({
  findings,
  description,
}: {
  findings: readonly TopicalFinding[];
  description?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">
          AktuĂˇlnĂ­ nĂˇlezy z dalĹˇĂ­ch ĹˇetĹ™enĂ­
        </h3>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {findings.map((f) => (
          <article
            key={`${f.source}-${f.date}-${f.url}`}
            className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">{f.source_label}</span>
              <time className="text-slate-500">{f.date}</time>
            </div>
            <h4 className="mb-2 text-sm font-medium text-slate-900">{f.topic}</h4>
            <p className="mb-3 flex-1 text-xs leading-relaxed text-slate-600">{f.headline}</p>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-600 underline hover:text-slate-900"
            >
              CelĂ˝ report â†’
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
