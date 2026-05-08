import {
  PILLARS,
  PILLAR_WEIGHTS,
  type Event,
  type Pillar,
  type ScoreSnapshot,
  type StructuralBaseline,
} from '@/lib/types';
import { getMessages, methodologyDocPath, type Locale } from '@/i18n';
import { pillarAnchorId } from '@/i18n/pillar-info';
import { Sparkline } from './Sparkline';

interface Props {
  locale: Locale;
  snapshot: ScoreSnapshot;
  baseline: StructuralBaseline;
  /** Full timeline oldest-first; we slice last 52 per pillar. */
  timeline: readonly ScoreSnapshot[];
  prevSnapshot: ScoreSnapshot | null;
  /** Recent events used to derive each pillar's "Hlavní signál" headline. */
  recentEvents: readonly Event[];
}

/** Risk-zone threshold from the design spec. */
const RISK_THRESHOLD = 70;

const PILLAR_COLOR: Record<Pillar, string> = {
  electoral: '#2A53E0',
  governance: '#7C3AED',
  judicial: '#1B9AAA',
  media: '#E76F2C',
  civil: '#2DA86A',
  corruption: '#DC2626',
};

/**
 * Editorial pillars table. Replaces the recharts BarChart + PillarDetailGrid
 * combo on the home page with a single tabular layout that matches the
 * redesign's hairline-rule aesthetic.
 *
 * Each row is a link to the pillar's anchor in /metodika/pilire/. The "Hlavní
 * signál" cell is the headline of the highest-impact recent event in that
 * pillar — falls back to a "no movement this week" line.
 */
export function PillarsTable({ locale, snapshot, baseline, timeline, prevSnapshot, recentEvents }: Props) {
  const t = getMessages(locale);
  const T = t.pillarsTable;

  // For the Δ WEEK column we compare to prevSnapshot if available; otherwise
  // it shows 0 — matches the editorial intent (a fresh first week has no
  // movement to report).
  const lastWeeks = timeline.slice(-52);

  return (
    <section id="pilire" className="border-b border-black">
      <div className="mx-auto max-w-editorial px-6 py-14 md:px-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">{T.eyebrow}</div>
            <h2 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">{T.title}</h2>
          </div>
        </div>

        {/* Header row */}
        <div className="hidden grid-cols-12 border-y border-black py-3 text-[11px] uppercase tracking-[0.2em] text-black/50 md:grid">
          <div className="col-span-1">{T.headers.number}</div>
          <div className="col-span-3">{T.headers.pillar}</div>
          <div className="col-span-1 text-right">{T.headers.score}</div>
          <div className="col-span-1 text-right">{T.headers.deltaWeek}</div>
          <div className="col-span-1 text-right">{T.headers.deltaBaseline}</div>
          <div className="col-span-1 text-right">{T.headers.weight}</div>
          <div className="col-span-2">{T.headers.trend}</div>
          <div className="col-span-2">{T.headers.signal}</div>
        </div>

        <div className="divide-y divide-black/10">
          {PILLARS.map((p, i) => {
            const score = snapshot.pillars[p];
            const baselineValue = baseline.pillars[p];
            const dWeek = prevSnapshot ? score - prevSnapshot.pillars[p] : 0;
            const dBase = score - baselineValue;
            const weight = PILLAR_WEIGHTS[p];
            const color = PILLAR_COLOR[p];
            const critical = score < RISK_THRESHOLD;
            const sparkValues = lastWeeks.map((s) => s.pillars[p]);
            const signal = topEventHeadline(recentEvents, p, locale, T.noEvent);
            const detailHref = `${methodologyDocPath('pillars', locale)}#${pillarAnchorId(p, locale)}`;
            const fmt = (n: number) =>
              (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1).replace('.', locale === 'cs' ? ',' : '.');

            return (
              <a
                key={p}
                id={`pilire-${p}`}
                href={detailHref}
                className="group grid grid-cols-12 items-center py-5 transition hover:bg-black/[0.02]"
              >
                <div className="col-span-1 font-mono num text-[12px] text-black/45">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="col-span-12 md:col-span-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: color }}
                    />
                    <span className="text-[15px] font-medium tracking-tight">
                      {t.pillars[p].short}
                    </span>
                  </div>
                  {critical && (
                    <div
                      className="ml-5 mt-1 font-mono text-[11px] uppercase tracking-wider"
                      style={{ color }}
                    >
                      {T.riskZoneTag}
                    </div>
                  )}
                </div>
                <div className="col-span-3 text-right text-[18px] font-medium tracking-tight num md:col-span-1">
                  {score.toFixed(1)}
                </div>
                <div
                  className={`col-span-3 text-right font-mono text-[12px] num md:col-span-1 ${
                    Math.abs(dWeek) < 0.05 ? 'text-black/40' : dWeek < 0 ? 'text-black' : 'text-black/55'
                  }`}
                >
                  {fmt(dWeek)}
                </div>
                <div
                  className={`col-span-3 text-right font-mono text-[12px] num md:col-span-1 ${
                    Math.abs(dBase) < 0.05 ? 'text-black/40' : dBase < 0 ? 'text-black' : 'text-black/55'
                  }`}
                >
                  {fmt(dBase)}
                </div>
                <div className="col-span-3 text-right font-mono text-[12px] text-black/55 num md:col-span-1">
                  {(weight * 100).toFixed(0)} %
                </div>
                <div className="col-span-12 mt-2 md:col-span-2 md:mt-0">
                  <Sparkline
                    values={sparkValues}
                    width={160}
                    height={36}
                    pad={4}
                    color={color}
                    centerline
                    className="h-9 w-full"
                  />
                </div>
                <div className="col-span-12 mt-2 text-[12px] leading-snug text-black/65 md:col-span-2 md:mt-0">
                  {signal}
                  <span className="mt-1 block text-[10px] uppercase tracking-wider text-black/40 group-hover:text-black/70">
                    {T.detailLink}
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        <div className="mt-6 max-w-[70ch] text-[12px] leading-relaxed text-black/55">
          {T.footnote}
        </div>
      </div>
    </section>
  );
}

/**
 * Pick the most impactful recent event in a given pillar to display as the
 * "Hlavní signál" cell. Higher absolute score_impact wins; among equal
 * impacts, more recent wins. Returns the no-event placeholder if nothing.
 */
function topEventHeadline(
  events: readonly Event[],
  pillar: Pillar,
  locale: Locale,
  fallback: string,
): string {
  const inPillar = events.filter((e) => e.pillar === pillar);
  if (inPillar.length === 0) return fallback;
  const sorted = [...inPillar].sort((a, b) => {
    const aImpact = Math.abs(a.score_impact);
    const bImpact = Math.abs(b.score_impact);
    if (Math.abs(bImpact - aImpact) > 0.01) return bImpact - aImpact;
    return b.date.localeCompare(a.date);
  });
  const top = sorted[0]!;
  // Localised content with EN fallback to CS when missing.
  const headline = locale === 'en' ? (top.headline_en ?? top.headline) : top.headline;
  // Trim to ~90 chars to keep table cells readable on narrow widths.
  if (headline.length > 90) return headline.slice(0, 87) + '…';
  return headline;
}
