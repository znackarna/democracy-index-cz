'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  comparisonPath,
  eventsPath,
  homePath,
  methodologyIndexPath,
  supportPath,
  switchLocalePath,
  type Locale,
} from '@/i18n';

interface Props {
  locale: Locale;
  /**
   * Pre-resolved labels passed from the server. Keeping the i18n module
   * out of this client bundle and ensuring the slim editorial header has
   * exactly one source of truth for each piece of copy.
   */
  labels: {
    overview: string;
    pillars: string;
    events: string;
    comparison: string;
    methodology: string;
    support: string;
    languageSwitchAria: string;
    /** Right-side label, e.g. "2026 · týden 19" / "2026 · week 19". */
    weekLabel: string;
  };
}

/**
 * Editorial 56-px masthead per redesign-v2.
 *
 * - Bottom 1-px black hairline.
 * - Nav left: Přehled · Pilíře · Události · Srovnání · Metodika · Podpořit.
 *   "Pilíře" is an in-page anchor on home (#pilire); on subpages it links
 *   back to home + anchor.
 * - Right: monospace week label.
 * - No logo, no tagline (the slovní značka lives only in the hero H1).
 * - Locale switcher rendered as plain CS/EN text right of the week label.
 */
export function Header({ locale, labels }: Props) {
  const pathname = usePathname() ?? homePath(locale);
  const switchHref = switchLocalePath(pathname, locale);
  const homeHref = homePath(locale);
  const pillarsAnchor = `${homeHref}#pilire`;

  return (
    <header className="border-b border-black bg-paper">
      <div className="mx-auto flex h-14 max-w-editorial items-center justify-between gap-6 px-6 md:px-10">
        <nav className="flex items-center gap-5 text-[14px] md:gap-7">
          <Link href={homeHref} className="uhover font-medium">
            {labels.overview}
          </Link>
          <Link href={pillarsAnchor} className="uhover hidden md:inline">
            {labels.pillars}
          </Link>
          <Link href={eventsPath(locale)} className="uhover hidden md:inline">
            {labels.events}
          </Link>
          <Link href={comparisonPath(locale)} className="uhover hidden md:inline">
            {labels.comparison}
          </Link>
          <Link href={methodologyIndexPath(locale)} className="uhover">
            {labels.methodology}
          </Link>
          <Link href={supportPath(locale)} className="uhover hidden md:inline">
            {labels.support}
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[12px] text-black/55 num md:inline">
            {labels.weekLabel}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-black/55">
            {locale === 'cs' ? (
              <span className="font-medium text-black" aria-current="true">
                CS
              </span>
            ) : (
              <Link
                href={switchHref}
                hrefLang="cs"
                aria-label={labels.languageSwitchAria}
                className="hover:text-black"
              >
                CS
              </Link>
            )}
            <span className="text-black/30">/</span>
            {locale === 'en' ? (
              <span className="font-medium text-black" aria-current="true">
                EN
              </span>
            ) : (
              <Link
                href={switchHref}
                hrefLang="en"
                aria-label={labels.languageSwitchAria}
                className="hover:text-black"
              >
                EN
              </Link>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
