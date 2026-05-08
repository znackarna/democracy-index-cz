import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageContainer } from '../components/PageContainer';
import {
  renderMethodologyDoc,
  renderValidationReport,
} from '../lib/markdown';
import { getMessages, methodologyIndexPath, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
  slug: string;
}

export async function MethodologyDocView({ locale, slug }: Props) {
  const t = getMessages(locale);

  const validationPattern = locale === 'cs' ? /^validace-(\d{4}-q[1-4])$/ : /^validation-(\d{4}-q[1-4])$/;
  const validationMatch = validationPattern.exec(slug);
  if (validationMatch) {
    const quarter = validationMatch[1]!;
    const result = await renderValidationReport(locale, quarter);
    if (!result) notFound();
    return (
      <PageContainer>
        <article className="space-y-6">
          <Link
            href={methodologyIndexPath(locale)}
            className="text-[12px] uppercase tracking-[0.18em] text-black/55 hover:text-black"
          >
            {t.methodologyDocPage.backToIndex}
          </Link>
          {result.translationMissing && <TranslationPendingBanner locale={locale} />}
          <div
            className="prose prose-slate max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-headings:scroll-mt-24 prose-a:font-medium prose-a:text-black"
            dangerouslySetInnerHTML={{ __html: result.html }}
          />
        </article>
      </PageContainer>
    );
  }

  const result = await renderMethodologyDoc(locale, slug);
  if (!result) notFound();

  return (
    <PageContainer>
      <article className="space-y-6">
        <Link
          href={methodologyIndexPath(locale)}
          className="text-[12px] uppercase tracking-[0.18em] text-black/55 hover:text-black"
        >
          {t.methodologyDocPage.backToIndex}
        </Link>
        <header>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{result.doc.title}</h1>
          <p className="mt-3 max-w-3xl text-[15px] text-black/65">{result.doc.description}</p>
        </header>
        {result.translationMissing && <TranslationPendingBanner locale={locale} />}
        <div
          className="prose prose-slate max-w-none prose-headings:font-medium prose-headings:tracking-tight prose-headings:scroll-mt-24 prose-a:font-medium prose-a:text-black"
          dangerouslySetInnerHTML={{ __html: result.html }}
        />
      </article>
    </PageContainer>
  );
}

function TranslationPendingBanner({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  return (
    <aside className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <strong className="block">{t.methodologyDocPage.translationPendingTitle}</strong>
      <p className="mt-1 text-xs">{t.methodologyDocPage.translationPendingBody}</p>
    </aside>
  );
}
