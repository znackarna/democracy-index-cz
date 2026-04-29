import Link from 'next/link';
import type { Route } from 'next';

interface Props {
  title: string;
  /** Slug of related methodology doc — adds "Číst víc →" link. */
  readMore?: { slug: string; label?: string };
  children: React.ReactNode;
  /** Visual variant. Default 'info'. */
  variant?: 'info' | 'warn';
}

const VARIANT_STYLES = {
  info: {
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    iconBg: 'bg-slate-200',
    icon: 'ⓘ',
    iconColor: 'text-slate-700',
  },
  warn: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-200',
    icon: '⚠',
    iconColor: 'text-amber-800',
  },
} as const;

/**
 * Collapsible methodology callout. Uses native `<details>` so it works
 * without client-side JS (matters for static export). Closed by default to
 * keep the dashboard scannable; reader can expand for context.
 */
export function InfoBox({ title, readMore, children, variant = 'info' }: Props) {
  const v = VARIANT_STYLES[variant];
  return (
    <details className={`group rounded-xl border ${v.border} ${v.bg} text-sm`}>
      <summary
        className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-slate-700 transition hover:text-slate-900"
        // suppress default disclosure triangle in WebKit
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${v.iconBg} text-xs font-bold ${v.iconColor}`}
        >
          {v.icon}
        </span>
        <span className="font-medium">{title}</span>
        <span className="ml-auto text-xs text-slate-500 group-open:hidden">rozbalit</span>
        <span className="ml-auto hidden text-xs text-slate-500 group-open:inline">sbalit</span>
      </summary>
      <div className="space-y-3 border-t border-slate-200/70 px-4 py-3 text-slate-700">
        {children}
        {readMore && (
          <p className="pt-1">
            <Link
              href={`/methodology/${readMore.slug}/` as Route}
              className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
            >
              {readMore.label ?? 'Plný popis v metodice →'}
            </Link>
          </p>
        )}
      </div>
    </details>
  );
}
