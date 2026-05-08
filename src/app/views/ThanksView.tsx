import Link from 'next/link';
import { PageContainer } from '../components/PageContainer';
import { getMessages, homePath, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
}

export function ThanksView({ locale }: Props) {
  const t = getMessages(locale);
  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-black/50">
          {locale === 'cs' ? '08 — Děkujeme' : '08 — Thank you'}
        </div>
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">{t.thanks.pageTitle}</h1>
        <p className="text-[15px] leading-relaxed text-black/70">{t.thanks.pageBody}</p>
        <p className="text-[13px] text-black/55">{t.thanks.recurringNote}</p>
        <Link
          href={homePath(locale)}
          className="inline-block border border-black px-4 py-2 text-[13px] font-medium transition hover:bg-black hover:text-white"
        >
          ← {t.thanks.backHome}
        </Link>
      </div>
    </PageContainer>
  );
}
