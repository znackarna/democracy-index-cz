import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  listValidationReports,
  METHODOLOGY_DOCS,
  renderMethodologyDoc,
  renderValidationReport,
} from '../../lib/markdown';

interface Params {
  slug: string;
}

export async function generateStaticParams(): Promise<Params[]> {
  const validations = await listValidationReports();
  return [
    ...METHODOLOGY_DOCS.map((d) => ({ slug: d.slug })),
    ...validations.map((v) => ({ slug: v.slug })),
  ];
}

export const dynamicParams = false;

export default async function MethodologyDocPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  // Validation reports use slug pattern "validation-2026-q2"
  const validationMatch = /^validation-(\d{4}-q[1-4])$/.exec(slug);
  if (validationMatch) {
    const quarter = validationMatch[1]!;
    const html = await renderValidationReport(quarter);
    if (!html) notFound();
    return (
      <article className="space-y-6">
        <Link href="/methodology/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Metodika
        </Link>
        <div
          className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-a:text-slate-900 prose-a:font-medium"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    );
  }

  const result = await renderMethodologyDoc(slug);
  if (!result) notFound();

  return (
    <article className="space-y-6">
      <Link href="/methodology/" className="text-sm text-slate-500 hover:text-slate-900">
        ← Metodika
      </Link>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{result.doc.title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600">{result.doc.description}</p>
      </header>
      <div
        className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-a:text-slate-900 prose-a:font-medium"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    </article>
  );
}
