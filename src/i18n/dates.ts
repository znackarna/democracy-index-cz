/**
 * Date / week formatting helpers shared across the redesign.
 *
 * The site is "weekly" — every snapshot lives at an ISO-week granularity
 * (e.g. "2026-W19"). The hero eyebrow renders both the publish date and
 * the week number: "Pondělí · 18. května 2026 · Týden 19".
 *
 * All helpers are pure (no Intl runtime locale arg dependence) so the
 * results are deterministic and identical between server and client —
 * preventing hydration mismatches on a static-export site.
 */

import { getMessages, type Locale } from './index';

const CS_DAYS = [
  'Neděle',
  'Pondělí',
  'Úterý',
  'Středa',
  'Čtvrtek',
  'Pátek',
  'Sobota',
] as const;

const CS_DAYS_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'] as const;

const CS_MONTHS_GENITIVE = [
  'ledna',
  'února',
  'března',
  'dubna',
  'května',
  'června',
  'července',
  'srpna',
  'září',
  'října',
  'listopadu',
  'prosince',
] as const;

const EN_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const EN_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const EN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Parse "YYYY-Www" into its numeric components. Returns null on bad input.
 */
export function parseIsoWeek(week: string): { year: number; week: number } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) return null;
  return { year: Number(m[1]), week: Number(m[2]) };
}

/**
 * Returns the Monday (00:00 UTC) that starts the given ISO week.
 * Standard ISO-8601 algorithm.
 */
export function isoWeekToMonday(year: number, week: number): Date {
  // Jan 4th is always in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // 1..7 with Mon=1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return target;
}

/**
 * Format a date as "Pondělí · 18. května 2026" (CS) / "Monday · 18 May 2026" (EN).
 * Used by the hero eyebrow.
 */
export function formatLongDate(date: Date, locale: Locale): string {
  if (locale === 'cs') {
    const day = CS_DAYS[date.getUTCDay()];
    return `${day} · ${date.getUTCDate()}. ${CS_MONTHS_GENITIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }
  return `${EN_DAYS[date.getUTCDay()]} · ${date.getUTCDate()} ${EN_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Format a yyyy-mm-dd date as "DD.MM · Po" (CS) / "DD/MM · Mon" (EN).
 * Used by the events log left column.
 */
export function formatShortDate(iso: string, locale: Locale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const day = locale === 'cs' ? CS_DAYS_SHORT[date.getUTCDay()] : EN_DAYS_SHORT[date.getUTCDay()];
  if (locale === 'cs') {
    return `${m[3]}.${m[2]} · ${day}`;
  }
  return `${m[3]}/${m[2]} · ${day}`;
}

/**
 * Format week label for the masthead. CS: "2026 · týden 19", EN: "2026 · week 19".
 */
export function formatWeekLabel(week: string, locale: Locale): string {
  const parsed = parseIsoWeek(week);
  if (!parsed) return week;
  const t = getMessages(locale);
  return t.nav.weekLabelTemplate
    .replace('{year}', String(parsed.year))
    .replace('{week}', String(parsed.week));
}

/**
 * Format hero eyebrow: "Pondělí · 18. května 2026 · Týden 19" (CS) /
 * "Monday · 18 May 2026 · Week 19" (EN). Date is the Monday of the ISO week.
 */
export function formatHeroEyebrow(week: string, locale: Locale): string {
  const parsed = parseIsoWeek(week);
  if (!parsed) return week;
  const monday = isoWeekToMonday(parsed.year, parsed.week);
  const longDate = formatLongDate(monday, locale);
  const weekWord = locale === 'cs' ? 'Týden' : 'Week';
  return `${longDate} · ${weekWord} ${parsed.week}`;
}

/**
 * Format the footer "last updated" line:
 *   "Aktualizováno v pondělí 18. května v 6:00." (CS)
 *   "Updated on Monday, 18 May at 06:00." (EN)
 */
export function formatLastUpdated(week: string, locale: Locale): string {
  const parsed = parseIsoWeek(week);
  if (!parsed) return '';
  const monday = isoWeekToMonday(parsed.year, parsed.week);
  if (locale === 'cs') {
    const day = (CS_DAYS[monday.getUTCDay()] ?? '').toLowerCase();
    const month = CS_MONTHS_GENITIVE[monday.getUTCMonth()] ?? '';
    return `Aktualizováno v ${day} ${monday.getUTCDate()}. ${month} v 6:00.`;
  }
  const day = EN_DAYS[monday.getUTCDay()] ?? '';
  const month = EN_MONTHS[monday.getUTCMonth()] ?? '';
  return `Updated on ${day}, ${monday.getUTCDate()} ${month} at 06:00.`;
}
