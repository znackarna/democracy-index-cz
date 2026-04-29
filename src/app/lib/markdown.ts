import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const METHODOLOGY_ROOT = path.resolve(process.cwd(), 'methodology');

/** Static metadata for each methodology document we expose on the site. */
export interface MethodologyDoc {
  slug: string;
  /** File name without .md extension (used to find on disk). */
  file: string;
  title: string;
  /** Short Czech description shown in the TOC. */
  description: string;
}

/**
 * Curated registry. Order = order shown in TOC. The slug becomes the URL
 * (`/methodology/<slug>/`); the file is read from `methodology/<file>.md`.
 *
 * Files in `methodology/` not in this list (e.g. validation_2026-Q2.md) are
 * served from the catch-all route below.
 */
export const METHODOLOGY_DOCS: readonly MethodologyDoc[] = [
  {
    slug: 'pillars',
    file: 'pillars',
    title: 'Šest pilířů',
    description:
      'Co každý ze 6 pilířů (volby, vládnutí, justice, média, svobody, korupce) měří, jak se mapuje na zdroje a co do něj nepatří.',
  },
  {
    slug: 'severity',
    file: 'severity_rubric',
    title: 'Rubric závažnosti',
    description:
      'Pětistupňová škála závažnosti událostí 1–5 s konkrétními ČR příklady, pravidly eskalace/de-eskalace a kritérii „needs_review".',
  },
  {
    slug: 'weights',
    file: 'weights',
    title: 'Váhy pilířů',
    description:
      'Zdůvodnění aktuálních vah 15/20/20/15/15/15, diskuze alternativ a pravidla pro budoucí změny vah.',
  },
  {
    slug: 'governance',
    file: 'governance',
    title: 'Governance model',
    description:
      'Šest vrstev oversight (self-audit, source-count cap, daily reports, anomaly detection, monthly spot-check, public dispute) místo mandatory pre-merge review.',
  },
  {
    slug: 'structural-mapping',
    file: 'structural_mapping',
    title: 'Strukturální mapping',
    description:
      'Jak konkrétně se z V-Dem 2024 / EIU 2024 / FH 2025 / RSF / TI / WJP počítá strukturální baseline pro každý pilíř.',
  },
  {
    slug: 'changelog',
    file: 'CHANGELOG',
    title: 'Changelog',
    description:
      'Historie verzí metodiky. Každá změna pilířů, vah, rubric nebo governance modelu je zaznamenaná zde.',
  },
  {
    slug: 'issues',
    file: 'issues',
    title: 'Otevřené otázky',
    description:
      'Známé otevřené otázky a omezení současné metodiky, které čekají na řešení v dalších iteracích.',
  },
];

/** Read an MD file from methodology/ and process it to HTML at build time. */
export async function renderMethodologyDoc(slug: string): Promise<{
  doc: MethodologyDoc;
  html: string;
} | null> {
  const doc = METHODOLOGY_DOCS.find((d) => d.slug === slug);
  if (!doc) return null;
  const html = await renderMarkdownFile(path.join(METHODOLOGY_ROOT, `${doc.file}.md`));
  return { doc, html };
}

/**
 * Validation reports live alongside the curated docs but use a YYYY-Qx slug
 * pattern. Listed dynamically so new quarterly reports show up automatically.
 */
export async function listValidationReports(): Promise<Array<{ slug: string; quarter: string }>> {
  let entries: string[];
  try {
    entries = await readdir(METHODOLOGY_ROOT);
  } catch {
    return [];
  }
  return entries
    .filter((f) => /^validation_\d{4}-Q[1-4]\.md$/.test(f))
    .map((f) => {
      const quarter = f.replace(/^validation_/, '').replace(/\.md$/, '');
      return { slug: `validation-${quarter.toLowerCase()}`, quarter };
    })
    .sort((a, b) => b.quarter.localeCompare(a.quarter));
}

/** Render a validation report MD by quarter. */
export async function renderValidationReport(quarter: string): Promise<string | null> {
  const file = path.join(METHODOLOGY_ROOT, `validation_${quarter.toUpperCase()}.md`);
  try {
    return await renderMarkdownFile(file);
  } catch {
    return null;
  }
}

/**
 * Convert a Markdown file to HTML. Pre-processes `.md` links to point at our
 * web routes (so cross-references inside methodology files resolve to
 * `/methodology/<slug>/` instead of dead `.md` paths).
 */
async function renderMarkdownFile(file: string): Promise<string> {
  const raw = await readFile(file, 'utf-8');
  const rewritten = rewriteInternalLinks(raw);
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
    .use(rehypeStringify)
    .process(rewritten);
  return result.toString();
}

const FILE_TO_SLUG: Record<string, string> = Object.fromEntries(
  METHODOLOGY_DOCS.map((d) => [`${d.file}.md`, d.slug]),
);

/**
 * Rewrites links in Markdown source so methodology cross-references resolve
 * on the web rather than as broken .md paths.
 *
 * - `pillars.md` → `/methodology/pillars/`
 * - `governance.md` → `/methodology/governance/`
 * - `validation_2026-Q2.md` → `/methodology/validation-2026-q2/`
 * - GitHub-style relative paths (`../blob/main/methodology/x.md`) → web route
 *
 * Any `.md` link we don't recognize is left alone (renders as-is, broken
 * link visible during review).
 */
function rewriteInternalLinks(md: string): string {
  // Plain inline-style links: [text](file.md) or [text](file.md#anchor)
  return md.replace(/\]\(([^)\s]+\.md)(#[^)]*)?\)/g, (match, target: string, anchor?: string) => {
    const filename = path.basename(target);
    if (FILE_TO_SLUG[filename]) {
      return `](/methodology/${FILE_TO_SLUG[filename]}/${anchor ?? ''})`;
    }
    const validation = /^validation_(\d{4}-Q[1-4])\.md$/.exec(filename);
    if (validation) {
      return `](/methodology/validation-${validation[1]!.toLowerCase()}/${anchor ?? ''})`;
    }
    return match;
  });
}
