import Link from 'next/link';
import { CrossCountryBars } from '../components/CrossCountryBars';
import { CrossCountryMatrix } from '../components/CrossCountryMatrix';
import { InfoBox } from '../components/InfoBox';
import { PageContainer } from '../components/PageContainer';
import { readCrossCountry } from '../lib/data';
import { getMessages, methodologyDocPath, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
}

export async function ComparisonView({ locale }: Props) {
  const t = getMessages(locale);
  const data = await readCrossCountry();

  if (!data) {
    return (
      <PageContainer>
      <section className="border border-dashed border-black/30 bg-paper p-12 text-center text-black/55">
        <p>{t.comparison.noData}</p>
      </section>
      </PageContainer>
    );
  }

  const highlightCount = data.countries.filter((c) => c.highlight).length;
  const otherCountriesCount = data.countries.length - 1;

  return (
    <PageContainer>
    <div className="space-y-10">
      <section>
        <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">04 — {t.comparison.pageTitle}</div>
        <h1 className="mt-2 mb-3 text-3xl font-medium tracking-tight md:text-4xl">
          {t.comparison.pageTitle}
        </h1>
        <p className="max-w-3xl text-[15px] text-black/65">
          {t.comparison.pageIntro.pre}
          {otherCountriesCount}
          {t.comparison.pageIntro.mid}
          {data.indexes.length}
          {t.comparison.pageIntro.midSecond}
          <strong>{t.comparison.pageIntro.bold}</strong>
          {t.comparison.pageIntro.tail}
        </p>
      </section>

      <InfoBox
        locale={locale}
        title={t.comparison.legendInfoTitle}
        readMore={{ doc: 'crossCountry' }}
      >
        <p>
          <strong>{t.comparison.legendP1.bold}</strong>
          {t.comparison.legendP1.tail}
        </p>
        <p>
          <strong>{t.comparison.legendP2.bold}</strong>
          {t.comparison.legendP2.tail}
        </p>
        <p>
          <strong>{t.comparison.legendP3.bold1.replace('{n}', String(highlightCount))}</strong>
          {t.comparison.legendP3.mid}
          <strong>{t.comparison.legendP3.bold2}</strong>
          {t.comparison.legendP3.tail}
        </p>
      </InfoBox>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          {t.comparison.matrixHeading}
        </h2>
        <CrossCountryMatrix locale={locale} data={data} />
        <p className="mt-3 text-xs text-slate-500">{t.comparison.matrixNote}</p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">{t.comparison.detailHeading}</h2>
        <p className="mb-6 max-w-3xl text-sm text-slate-600">{t.comparison.detailIntro}</p>
        <CrossCountryBars
          countries={data.countries}
          indexes={data.indexes}
          labels={{
            multiDimension: t.comparison.multiDimension,
            singleDimension: t.comparison.singleDimension,
            scaleLabel: t.comparison.scaleLabel,
            sourceLink: t.comparison.sourceLink,
            subPillarsHeading: t.comparison.subPillarsHeading,
            scoreTooltip: t.comparison.scoreTooltip,
          }}
        />
      </section>

      <section className="border border-black/15 bg-paper p-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          {t.comparison.methodologyHeading}
        </h3>
        <p className="text-sm text-slate-700">
          {t.comparison.methodologyP1.pre}
          <Link
            href={methodologyDocPath('crossCountry', locale)}
            className="underline hover:text-slate-900"
          >
            {t.comparison.methodologyP1.link}
          </Link>
          {t.comparison.methodologyP1.mid}
          <Link
            href={methodologyDocPath('structuralMapping', locale)}
            className="underline hover:text-slate-900"
          >
            {t.comparison.methodologyP1.link2}
          </Link>
          {t.comparison.methodologyP1.tail}
        </p>
        {data.notes && (
          <p className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
            {data.notes}
          </p>
        )}
      </section>
    </div>
    </PageContainer>
  );
}
