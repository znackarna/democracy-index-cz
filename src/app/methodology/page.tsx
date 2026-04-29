import Link from 'next/link';
import { listValidationReports, METHODOLOGY_DOCS } from '../lib/markdown';

export default async function MethodologyIndexPage() {
  const validations = await listValidationReports();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">Metodika</h1>
        <p className="max-w-3xl text-slate-600">
          Plný popis toho, jak index vznikne — od strukturálního baseline přes klasifikaci
          týdenních událostí až k oversight modelu, který drží kvalitu bez mandatory pre-merge
          review. Každý dokument je živý, verzovaný v Gitu a měnitelný jen přes commit
          s odůvodněním v <Link href="/methodology/changelog/" className="underline hover:text-slate-900">CHANGELOGu</Link>.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Hlavní dokumenty</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {METHODOLOGY_DOCS.filter((d) => d.slug !== 'changelog' && d.slug !== 'issues').map(
            (doc) => (
              <Link
                key={doc.slug}
                href={`/methodology/${doc.slug}/`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
              >
                <h3 className="text-base font-semibold text-slate-900">{doc.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{doc.description}</p>
                <span className="mt-3 inline-block text-xs text-slate-500">Číst →</span>
              </Link>
            ),
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Audit trail</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {METHODOLOGY_DOCS.filter((d) => d.slug === 'changelog' || d.slug === 'issues').map(
            (doc) => (
              <Link
                key={doc.slug}
                href={`/methodology/${doc.slug}/`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
              >
                <h3 className="text-base font-semibold text-slate-900">{doc.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{doc.description}</p>
                <span className="mt-3 inline-block text-xs text-slate-500">Číst →</span>
              </Link>
            ),
          )}
        </div>
      </section>

      {validations.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Kvartální validační reporty</h2>
          <p className="mb-4 max-w-3xl text-sm text-slate-600">
            Automaticky generované srovnání našeho indexu s externími benchmarky (V-Dem, EIU,
            FH, RSF, TI CPI, WJP). Práh trvalé divergence &gt; 10 b. ve dvou kvartálech
            triggeruje methodology review.
          </p>
          <ul className="space-y-2">
            {validations.map((v) => (
              <li key={v.slug}>
                <Link
                  href={`/methodology/${v.slug}/`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900"
                >
                  validation_{v.quarter} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
