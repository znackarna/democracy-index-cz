import Link from 'next/link';
import {
  PILLARS,
  PILLAR_WEIGHTS,
  type Pillar,
  type ScoreSnapshot,
  type StructuralBaseline,
} from '@/lib/types';
import { eventsPath, getMessages, methodologyIndexPath, type Locale } from '@/i18n';
import { formatHeroEyebrow } from '@/i18n/dates';
import { Sparkline } from './Sparkline';

interface Props {
  locale: Locale;
  snapshot: ScoreSnapshot;
  baseline: StructuralBaseline;
  /** All snapshots oldest-first; we slice the last 52 for the sparkline. */
  timeline: readonly ScoreSnapshot[];
  /** Previous week for the WoW delta. May be the same as
   *  timeline.at(-2); passed explicitly so HomeView controls the source. */
  prevSnapshot: ScoreSnapshot | null;
}

/**
 * Hero section per redesign-v2.
 *
 * Reads the live snapshot, baseline and timeline. The "lede" paragraph picks
 * the two lowest-scoring pillars as inline links so the journalistic copy
 * stays anchored in actual data rather than hard-coded political phrasing.
 */
export function Hero({ locale, snapshot, baseline, timeline, prevSnapshot }: Props) {
  const t = getMessages(locale);
  const h = t.hero;

  const baselineWeighted = PILLARS.reduce(
    (sum, p) => sum + baseline.pillars[p] * PILLAR_WEIGHTS[p],
    0,
  );
  const score = snapshot.overall_score;
  const deltaBaseline = score - baselineWeighted; // negative = below baseline
  const deltaWeek = prevSnapshot ? score - prevSnapshot.overall_score : 0;

  // Hero eyebrow: "Pondělí · 18. května 2026 · Týden 19".
  const eyebrow = formatHeroEyebrow(snapshot.week, locale);

  // Pick two lowest pillars for the lede inline links.
  const ranked = [...PILLARS].sort((a, b) => snapshot.pillars[a] - snapshot.pillars[b]);
  const lowestPillar = ranked[0] ?? 'governance';
  const secondPillar = ranked[1] ?? 'corruption';
  const ledeRendered = renderLede(h.lede, locale, [lowestPillar, secondPillar], t);

  // Sparkline values: last 52 weekly overall scores, oldest-first.
  const sparkValues = timeline.slice(-52).map((s) => s.overall_score);

  // Number caption: "{baselineDelta} Za poslední týden {weekDelta}."
  const weekDelta = formatWeekDelta(deltaWeek, h);
  const baselineDelta = formatBaselineDelta(deltaBaseline, locale, h);
  const numberCaption = h.numberCaption
    .replace('{baselineDelta}', baselineDelta)
    .replace('{weekDelta}', weekDelta);

  // Big number: integer + decimal split for the blue accent on the decimal.
  const intPart = Math.trunc(score).toString();
  const decPart = score.toFixed(1).split('.')[1] ?? '0';

  return (
    <section id="prehled" className="border-b border-black">
      <div className="mx-auto max-w-editorial px-6 pb-10 pt-14 md:px-10">
        <div className="grid grid-cols-12 gap-8 md:gap-12">
          {/* Left: meta + headline + lede + buttons */}
          <div className="col-span-12 lg:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.2em] text-black/50">{eyebrow}</div>
            <div className="accent-rule mb-5 mt-5 h-[3px] w-12" aria-hidden />
            <h1
              className="text-[40px] font-medium leading-[1.02] tracking-tight md:text-[56px]"
              style={{ textWrap: 'balance' }}
            >
              {h.headline}
              <span className="text-accent">.</span>
            </h1>
            <p
              className="mt-5 max-w-[44ch] text-[17px] leading-[1.55] text-black/70"
              style={{ textWrap: 'pretty' }}
            >
              {ledeRendered}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={eventsPath(locale)}
                className="inline-flex h-10 items-center gap-2 bg-accent px-4 text-[13px] font-medium text-white transition hover:bg-accent-deep"
              >
                {h.primaryCta}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 7h8M7 3l4 4-4 4" />
                </svg>
              </Link>
              <Link
                href={methodologyIndexPath(locale)}
                className="inline-flex h-10 items-center gap-2 border border-black px-4 text-[13px] font-medium transition hover:bg-black hover:text-white"
              >
                {h.secondaryCta}
              </Link>
            </div>
          </div>

          {/* Right: number + sparkline */}
          <div className="col-span-12 lg:col-span-7 lg:border-l lg:border-black/15 lg:pl-12">
            <div className="grid grid-cols-12 gap-6">
              <div className="gridlines relative col-span-12 md:col-span-7">
                <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-black/50">
                  {h.valueOfTheWeek}
                </div>
                <div className="flex items-start gap-2">
                  <div className="num text-[clamp(7rem,16vw,12rem)] font-medium leading-[0.85] tracking-tightest">
                    {intPart}
                    <span className="text-accent">.{decPart}</span>
                  </div>
                </div>
                <p className="mt-5 max-w-[34ch] text-[14px] leading-snug text-black/70">
                  {numberCaption}
                </p>
                <div className="mt-6 flex items-center gap-3 text-[12px] uppercase tracking-[0.18em]">
                  <span className="inline-flex items-center gap-2 border border-accent px-2 py-1 text-accent">
                    <span className="inline-block h-1.5 w-1.5 bg-accent" aria-hidden />
                    {h.statusBadgeLabel}
                  </span>
                </div>
              </div>

              <div className="col-span-12 flex flex-col md:col-span-5">
                <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-black/50">
                  <span>{h.sparklineEyebrowLeft}</span>
                  <span className="font-mono num text-black/70">{h.sparklineEyebrowRight}</span>
                </div>
                <div className="border-y border-black/15 py-3">
                  <Sparkline
                    values={sparkValues}
                    width={320}
                    height={90}
                    pad={6}
                    color="#1944B8"
                    area
                    baseline={baselineWeighted}
                    baselineLabel={h.sparklineBaselineLabel.replace(
                      '{value}',
                      baselineWeighted.toFixed(1),
                    )}
                    className="h-[120px] w-full"
                  />
                </div>
                <div className="mt-5 text-[13px] leading-relaxed text-black/65">
                  {h.sparklineCaption}
                </div>
                <div className="mt-auto max-w-[40ch] pt-5 text-[11px] leading-relaxed text-black/50">
                  {h.sparklineFootnote
                    .split('{methodologyLink}')
                    .map((part, i, arr) => (
                      <span key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <Link
                            href={methodologyIndexPath(locale)}
                            className="underline underline-offset-2 hover:text-black"
                          >
                            {h.sparklineMethodologyLink}
                          </Link>
                        )}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function renderLede(
  template: string,
  locale: Locale,
  [p1, p2]: [Pillar, Pillar],
  t: ReturnType<typeof getMessages>,
): React.ReactNode {
  // Replace {pillar1} / {pillar2} placeholders with anchor links to the
  // pillars table on the home page (#pilire-<key>).
  const slot1 = `[[${p1}]]`;
  const slot2 = `[[${p2}]]`;
  const filled = template.replace('{pillar1}', slot1).replace('{pillar2}', slot2);
  const parts = filled.split(/(\[\[[a-z]+\]\])/g);
  return parts.map((part, i) => {
    const m = /^\[\[([a-z]+)\]\]$/.exec(part);
    if (!m) return <span key={i}>{part}</span>;
    const pillar = m[1] as Pillar;
    return (
      <Link
        key={i}
        href={`#pilire-${pillar}`}
        className="underline decoration-black/30 underline-offset-4 hover:decoration-black"
      >
        {t.pillars[pillar].short.toLowerCase()}
      </Link>
    );
  });
}

function formatWeekDelta(deltaWeek: number, h: { weekDeltaDown: string; weekDeltaUp: string; weekDeltaFlat: string }): string {
  if (Math.abs(deltaWeek) < 0.05) return h.weekDeltaFlat;
  const value = Math.abs(deltaWeek).toFixed(1).replace('.', ',');
  const tmpl = deltaWeek < 0 ? h.weekDeltaDown : h.weekDeltaUp;
  return tmpl.replace('{value}', value);
}

function formatBaselineDelta(
  deltaBaseline: number,
  locale: Locale,
  h: { baselineDeltaDown: string; baselineDeltaUp: string; baselineDeltaFlat: string },
): string {
  if (Math.abs(deltaBaseline) < 0.05) return h.baselineDeltaFlat;
  const v = Math.abs(deltaBaseline).toFixed(1).replace('.', locale === 'cs' ? ',' : '.');
  const tmpl = deltaBaseline < 0 ? h.baselineDeltaDown : h.baselineDeltaUp;
  return tmpl.replace('{value}', v);
}
