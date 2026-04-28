import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col">
          <span className="text-lg font-semibold text-slate-900">Index demokracie ČR</span>
          <span className="text-xs text-slate-500">
            Týdně aktualizovaný · auditovatelný · open source
          </span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/" className="text-slate-700 hover:text-slate-900">
            Přehled
          </Link>
          <Link href="/events/" className="text-slate-700 hover:text-slate-900">
            Události
          </Link>
          <a
            href="https://github.com/znackarna/personal-democracy/tree/main/methodology"
            className="text-slate-700 hover:text-slate-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            Metodika ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
