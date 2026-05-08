import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '../globals.css';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { readTimeline } from '../lib/data';
import { formatLastUpdated, formatWeekLabel } from '@/i18n/dates';
import { getMessages } from '@/i18n';

const t = getMessages('cs');

export const metadata: Metadata = {
  title: t.meta.siteTitle,
  description: t.meta.siteDescription,
  alternates: {
    languages: {
      cs: '/',
      en: '/en',
    },
  },
};

export default async function CzechRootLayout({ children }: { children: React.ReactNode }) {
  // Latest snapshot drives the week label in the masthead and the
  // "Aktualizováno v pondělí …" line in the footer. Single source of truth
  // is data/scores/timeline.json — read at build time (static export).
  const timeline = await readTimeline();
  const latestWeek = timeline.at(-1)?.week ?? '';
  const weekLabel = latestWeek ? formatWeekLabel(latestWeek, 'cs') : '';
  const lastUpdated = latestWeek ? formatLastUpdated(latestWeek, 'cs') : '';

  return (
    <html lang="cs" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <Header
          locale="cs"
          labels={{
            overview: t.nav.overview,
            pillars: t.nav.pillars,
            events: t.nav.events,
            comparison: t.nav.comparison,
            methodology: t.nav.methodology,
            support: t.nav.support,
            languageSwitchAria: t.nav.languageSwitchAria,
            weekLabel,
          }}
        />
        <main>{children}</main>
        <Footer locale="cs" lastUpdated={lastUpdated} />
        <Analytics />
      </body>
    </html>
  );
}
