import Link from 'next/link';
import { PublicOpinion } from './PublicOpinion';
import {
  getMessages,
  methodologyDocPath,
  type Locale,
} from '@/i18n';
import type { PollSeries, TopicalFinding } from '@/lib/types';

interface Props {
  locale: Locale;
  series: readonly PollSeries[];
  topical: readonly TopicalFinding[] | null;
  topicalDescription?: string;
}

/**
 * Editorial wrapper around the existing client-side PublicOpinion charts.
 *
 * The redesign-v2 spec did not include a public-opinion section on the
 * home, but the project already publishes CVVM trust series + STEM/Median
 * topical findings — dropping them would lose user-visible content. This
 * component reintroduces the section in the design's editorial idiom
 * (numbered eyebrow, hairline-bordered, no rounded cards).
 *
 * Renders nothing if both series and topical are empty.
 */
export function PublicOpinionSection({ locale, series, topical, topicalDescription }: Props) {
  if (series.length === 0 && (!topical || topical.length === 0)) return null;

  const t = getMessages(locale);
  const P = t.publicOpinionSection;

  return (
    <section id="verejne-mineni" className="border-b border-black">
      <div className="mx-auto max-w-editorial px-6 py-14 md:px-10">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">
              {P.eyebrow}
            </div>
            <h2 className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">{P.title}</h2>
          </div>
        </div>

        <p className="mb-8 max-w-3xl text-[14px] leading-relaxed text-black/65">
          {P.intro
            .split(/(\{bold\}|\{link\})/g)
            .map((part, i) => {
              if (part === '{bold}') return <strong key={i}>{P.introBold}</strong>;
              if (part === '{link}')
                return (
                  <Link
                    key={i}
                    href={methodologyDocPath('publicOpinion', locale)}
                    className="underline underline-offset-2 hover:text-black"
                  >
                    {P.introLink}
                  </Link>
                );
              return <span key={i}>{part}</span>;
            })}
        </p>

        <PublicOpinion
          series={series}
          topical={topical}
          {...(topicalDescription ? { topicalDescription } : {})}
          labels={{
            sourceLink: t.publicOpinion.sourceLink,
            methodologyChangeLabel: t.publicOpinion.methodologyChangeLabel,
            methodologyChangeNotePrefix: t.publicOpinion.methodologyChangeNotePrefix,
            topicalHeading: t.publicOpinion.topicalHeading,
            topicalReportLink: t.publicOpinion.topicalReportLink,
          }}
        />
      </div>
    </section>
  );
}
