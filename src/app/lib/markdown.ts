import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const METHODOLOGY_ROOT = path.resolve(process.cwd(), 'methodology');
const SOURCES_YAML = path.resolve(process.cwd(), 'config', 'sources.yaml');

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
 * (`/metodika/<slug>/`); the file is read from `methodology/<file>.md`.
 *
 * Files in `methodology/` not in this list (e.g. validation_2026-Q2.md) are
 * served from the catch-all route below.
 */
export const METHODOLOGY_DOCS: readonly MethodologyDoc[] = [
  {
    slug: 'pilire',
    file: 'pillars',
    title: 'Šest pilířů',
    description:
      'Co každý ze 6 pilířů (volby, vládnutí, justice, média, svobody, korupce) měří, jak se mapuje na zdroje a co do něj nepatří.',
  },
  {
    slug: 'zavaznost',
    file: 'severity_rubric',
    title: 'Rubric závažnosti',
    description:
      'Pětistupňová škála závažnosti událostí 1–5 s konkrétními ČR příklady, pravidly eskalace/de-eskalace a kritérii „needs_review".',
  },
  {
    slug: 'vahy',
    file: 'weights',
    title: 'Váhy pilířů',
    description:
      'Zdůvodnění aktuálních vah 15/20/20/15/15/15, diskuze alternativ a pravidla pro budoucí změny vah.',
  },
  {
    slug: 'model-dohledu',
    file: 'governance',
    title: 'Model dohledu',
    description:
      'Šest vrstev oversight (self-audit, source-count cap, daily reports, anomaly detection, monthly spot-check, public dispute) místo mandatory pre-merge review.',
  },
  {
    slug: 'strukturalni-mapovani',
    file: 'structural_mapping',
    title: 'Strukturální mapování',
    description:
      'Jak konkrétně se z V-Dem 2024 / EIU 2024 / FH 2025 / RSF / TI / WJP počítá strukturální baseline pro každý pilíř.',
  },
  {
    slug: 'zdroje',
    file: 'sources',
    title: 'Zdroje dat',
    description:
      'Odkud index čerpá — 8 českých redakčních médií, otevřená data PSP a soudů, watchdog organizace, mezinárodní zpravodajství. Aktuální tabulka generovaná z config/sources.yaml.',
  },
  {
    slug: 'verejne-mineni',
    file: 'public_opinion',
    title: 'Veřejné mínění',
    description:
      'Doplňkový read-only kontext z průzkumů (CVVM, STEM, Median). Nevstupuje do skóre — proč ne, jak ho užívat, co plánujeme přidat. Zdroje a jejich profil.',
  },
  {
    slug: 'zmeny',
    file: 'CHANGELOG',
    title: 'Changelog',
    description:
      'Historie verzí metodiky. Každá změna pilířů, vah, rubric nebo governance modelu je zaznamenaná zde.',
  },
  {
    slug: 'otevrene-otazky',
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
      return { slug: `validace-${quarter.toLowerCase()}`, quarter };
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
 * `/metodika/<slug>/` instead of dead `.md` paths). Also expands the
 * `<!-- SOURCES_TABLE -->` marker into a live table generated from
 * config/sources.yaml — used by methodology/sources.md to stay in sync.
 */
async function renderMarkdownFile(file: string): Promise<string> {
  const raw = await readFile(file, 'utf-8');
  const withTable = await injectSourcesTable(raw);
  const rewritten = rewriteInternalLinks(withTable);
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

// ============================================================
// Auto-rendered sources table (used by methodology/sources.md)
// ============================================================

/**
 * Adaptery, které jsou skutečně implementované pro non-RSS zdroje. Všechny
 * RSS zdroje jsou aktivní z principu (čte je rss-parser). Cokoli mimo tento
 * set + non-RSS = "nezapojený" placeholder.
 *
 * Pokud přidáš adapter pro nový zdroj v src/pipeline/fetch-sources.ts,
 * doplň ho i sem, jinak se bude na webu hlásit jako neaktivní.
 */
const IMPLEMENTED_NON_RSS_ADAPTERS = new Set<string>([
  'psp-cz',
  'hlidac-statu',
  'hlidac-smlouvy',
  'hlidac-dotace',
]);

const CATEGORY_LABELS: Record<string, string> = {
  czech_media: 'Česká média',
  open_data: 'Otevřená data',
  watchdog: 'Watchdog',
  international: 'Mezinárodní',
};

const TYPE_LABELS: Record<string, string> = {
  rss: 'RSS feed',
  api: 'API',
  html: 'HTML scraper',
};

interface YamlSource {
  id: string;
  name: string;
  category: string;
  type: string;
  url: string;
  homepage?: string;
  notes?: string;
}

interface YamlSourcesFile {
  version: number;
  sources: YamlSource[];
}

async function injectSourcesTable(md: string): Promise<string> {
  if (!md.includes('<!-- SOURCES_TABLE -->')) return md;
  const sources = await loadYamlSources();
  return md.replace('<!-- SOURCES_TABLE -->', renderSourcesMarkdown(sources));
}

async function loadYamlSources(): Promise<YamlSource[]> {
  const raw = await readFile(SOURCES_YAML, 'utf-8');
  const parsed = yaml.load(raw) as YamlSourcesFile;
  return parsed.sources ?? [];
}

function isActive(s: YamlSource): boolean {
  if (s.type === 'rss') return true;
  return IMPLEMENTED_NON_RSS_ADAPTERS.has(s.id);
}

/**
 * Skupinkuje zdroje podle kategorie (zachová pořadí z yamlu uvnitř skupiny)
 * a pro každou kategorii vyrenderuje vlastní tabulku se sloupci:
 * Stav | Zdroj | Typ | Poznámka. Linky vedou na homepage (čitelnější
 * než API endpointy).
 */
function renderSourcesMarkdown(sources: YamlSource[]): string {
  const order: ReadonlyArray<string> = ['czech_media', 'open_data', 'watchdog', 'international'];
  const grouped = new Map<string, YamlSource[]>();
  for (const s of sources) {
    const list = grouped.get(s.category) ?? [];
    list.push(s);
    grouped.set(s.category, list);
  }
  const sections: string[] = [];
  for (const cat of order) {
    const list = grouped.get(cat);
    if (!list || list.length === 0) continue;
    const active = list.filter(isActive).length;
    sections.push(`### ${CATEGORY_LABELS[cat] ?? cat} (${active}/${list.length} aktivních)`);
    sections.push('');
    sections.push('| Stav | Zdroj | Typ | Poznámka |');
    sections.push('|------|-------|-----|----------|');
    for (const s of list) {
      sections.push(renderRow(s));
    }
    sections.push('');
  }
  return sections.join('\n');
}

function renderRow(s: YamlSource): string {
  const stav = isActive(s) ? '✓ aktivní' : '⏸ nezapojený';
  const link = s.homepage ?? s.url;
  const name = `[${escapeCell(s.name)}](${link})`;
  const typ = TYPE_LABELS[s.type] ?? s.type;
  const note = firstNoteSentence(s.notes);
  return `| ${stav} | ${name} | ${typ} | ${note} |`;
}

/** Vezme první větu z `notes` a očistí ji pro tabulkovou buňku. */
function firstNoteSentence(notes: string | undefined): string {
  if (!notes) return '–';
  const flattened = notes.replace(/\s+/g, ' ').trim();
  if (!flattened) return '–';
  const firstSentence = flattened.split(/(?<=[.!?])\s/)[0] ?? flattened;
  const trimmed = firstSentence.length > 220 ? `${firstSentence.slice(0, 217)}…` : firstSentence;
  return escapeCell(trimmed);
}

/** Markdown-table cells nesmějí obsahovat `|` ani neuzavřené znaky. */
function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const FILE_TO_SLUG: Record<string, string> = Object.fromEntries(
  METHODOLOGY_DOCS.map((d) => [`${d.file}.md`, d.slug]),
);

/**
 * Rewrites links in Markdown source so methodology cross-references resolve
 * on the web rather than as broken .md paths.
 *
 * - `pillars.md` → `/metodika/pilire/`
 * - `governance.md` → `/metodika/model-dohledu/`
 * - `validation_2026-Q2.md` → `/metodika/validace-2026-q2/`
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
      return `](/metodika/${FILE_TO_SLUG[filename]}/${anchor ?? ''})`;
    }
    const validation = /^validation_(\d{4}-Q[1-4])\.md$/.exec(filename);
    if (validation) {
      return `](/metodika/validace-${validation[1]!.toLowerCase()}/${anchor ?? ''})`;
    }
    return match;
  });
}
