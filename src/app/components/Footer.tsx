import Link from 'next/link';
import { getMessages, supportPath, type Locale } from '@/i18n';

interface Props {
  locale: Locale;
  /** "Pondělí · 27. dubna 2026 · Týden 18" string built from the latest
   *  snapshot's computed_at + week. Empty string if no snapshot yet.
   *  Same string the masthead shows on the right. */
  updateLabel: string;
}

/**
 * Editorial footer per redesign-v2 spec. 12-col grid. Many of the link
 * destinations are aspirational (Tým, Financování, Vědecká rada members …)
 * — those have no href yet and render as plain text. The user reviews
 * MORNING-CHECKLIST.md to decide which ones get real targets.
 *
 * Active hrefs:
 *   - GitHub repo (top)
 *   - Methodology TOC (Historie změn → /metodika/zmeny/)
 *   - /podpora/ (Financování)
 *   - mailto: contact email
 */
export function Footer({ locale, updateLabel }: Props) {
  const t = getMessages(locale);
  const f = t.footer;
  const year = new Date().getUTCFullYear();
  const copyright = f.copyright.replace('{year}', String(year));
  const repoUrl = t.meta.repoUrl;
  const changelogHref = locale === 'cs' ? '/metodika/zmeny/' : '/en/methodology/changelog/';

  return (
    <footer className="border-t border-black bg-paper">
      <div className="mx-auto max-w-editorial px-6 py-10 text-[12px] text-black/60 md:px-10">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-12">
        <div className="col-span-2 md:col-span-4">
          <div className="text-[14px] font-medium text-black">{f.brandName}</div>
          <div className="mt-2 max-w-[36ch]">{f.brandTagline}</div>
          {updateLabel && (
            <div className="mt-2 font-mono num text-black/55">{updateLabel}</div>
          )}
        </div>

        <FooterColumn
          heading={f.columns.project.heading}
          items={[
            { label: f.columns.project.about, href: null },
            { label: f.columns.project.team, href: null },
            { label: f.columns.project.funding, href: supportPath(locale) },
          ]}
        />
        <FooterColumn
          heading={f.columns.data.heading}
          items={[
            { label: f.columns.data.downloads, href: `${repoUrl}/tree/main/data` },
            { label: f.columns.data.api, href: null },
            { label: f.columns.data.history, href: changelogHref },
          ]}
        />
        <FooterColumn
          heading={f.columns.board.heading}
          items={[
            { label: f.columns.board.members, href: null },
            { label: f.columns.board.review, href: null },
            { label: f.columns.board.publicNotes, href: `${repoUrl}/issues` },
          ]}
        />
        <FooterColumn
          heading={f.columns.contact.heading}
          items={[
            { label: f.columns.contact.email, href: `mailto:${f.columns.contact.email}` },
            { label: f.columns.contact.forJournalists, href: null },
            { label: f.columns.contact.securityTip, href: null },
          ]}
        />

        <div className="col-span-2 mt-2 flex flex-wrap justify-between gap-3 border-t border-black/10 pt-4 md:col-span-12">
          <span>{copyright}</span>
          <span className="font-mono">{f.license}</span>
        </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  items,
}: {
  heading: string;
  items: Array<{ label: string; href: string | null }>;
}) {
  return (
    <div className="col-span-1 min-w-0 md:col-span-2">
      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-black/40">{heading}</div>
      {items.map((item) => {
        if (!item.href) {
          // No target page yet — render as plain (greyed) text. This is
          // intentional: we surface the planned section so the reader sees
          // the editorial structure even before the page is built.
          return (
            <span
              key={item.label}
              className="block text-black/35"
              title="Připravujeme"
            >
              {item.label}
            </span>
          );
        }
        if (item.href.startsWith('mailto:') || item.href.startsWith('http')) {
          return (
            <a
              key={item.label}
              href={item.href}
              className="uhover block break-all"
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {item.label}
            </a>
          );
        }
        return (
          <Link key={item.label} href={item.href} className="uhover block break-all">
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
