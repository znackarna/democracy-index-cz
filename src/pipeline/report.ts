import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type AuditResult } from './audit';
import { type CapAdjustment } from './cap-severity';
import { type Anomaly } from './detect-anomalies';
import { PILLARS, type Event, type IsoWeek, type ScoreSnapshot } from '../lib/types';

export interface ReportInput {
  date: Date;
  week: IsoWeek;
  perSource: Array<{ id: string; type: string; count: number; error?: string }>;
  fetched: number;
  preFiltered: number;
  events: readonly Event[];
  cappedEvents: CapAdjustment[];
  audit?: AuditResult;
  prevSnapshot?: ScoreSnapshot;
  newSnapshot: ScoreSnapshot;
  anomalies: readonly Anomaly[];
}

/**
 * Write `data/reports/YYYY-MM-DD.md` with a structured audit trail of one
 * pipeline run. Reports are committed to git and serve as long-term review
 * material — reviewer can browse them monthly/quarterly without needing to
 * re-execute the pipeline.
 *
 * Returns the absolute path written.
 */
export async function writeDailyReport(input: ReportInput, projectRoot: string): Promise<string> {
  const dateStr = input.date.toISOString().slice(0, 10);
  const dir = path.join(projectRoot, 'data', 'reports');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${dateStr}.md`);
  await writeFile(file, render(input, dateStr), 'utf-8');
  return file;
}

function render(input: ReportInput, dateStr: string): string {
  const lines: string[] = [];

  lines.push(`# Daily report — ${dateStr} (week ${input.week})`);
  lines.push('');
  lines.push(`Computed at ${input.newSnapshot.computed_at}.`);
  lines.push('');

  // Source coverage
  lines.push('## Source coverage');
  lines.push('');
  for (const s of input.perSource) {
    const tag = s.error ? `_error: ${s.error}_` : `${s.count} articles`;
    lines.push(`- **${s.id}** (${s.type}): ${tag}`);
  }
  lines.push('');
  lines.push(`Total fetched: **${input.fetched}** articles.`);
  lines.push('');

  // Pre-filter
  lines.push('## Pre-filter');
  lines.push('');
  const keptRate = input.fetched === 0 ? 0 : (input.preFiltered / input.fetched) * 100;
  lines.push(`- Kept: **${input.preFiltered}** of ${input.fetched} (${keptRate.toFixed(1)} %)`);
  lines.push(`- Dropped: ${input.fetched - input.preFiltered}`);
  lines.push('');

  // Classification summary
  lines.push('## Classification');
  lines.push('');
  lines.push(`- Final events written: **${input.events.length}**`);

  const sevDist = countBy(input.events, (e) => (e.severity ?? 'null').toString());
  lines.push(
    `- Severity distribution: ${formatDistribution(sevDist, ['1', '2', '3', '4', '5', 'null'])}`,
  );

  const dirDist = countBy(input.events, (e) =>
    e.direction === 1 ? '+1' : e.direction === -1 ? '-1' : '0',
  );
  lines.push(`- Direction: ${formatDistribution(dirDist, ['-1', '0', '+1'])}`);

  const pillarDist = countBy(input.events, (e) => e.pillar);
  lines.push(`- Pillar: ${formatDistribution(pillarDist, [...PILLARS])}`);

  const statusDist = countBy(input.events, (e) => e.status);
  lines.push(`- Status: ${formatDistribution(statusDist, ['active', 'needs_review', 'disputed', 'resolved'])}`);
  lines.push('');

  // Source-count cap
  lines.push('## Source-count → severity cap');
  lines.push('');
  if (input.cappedEvents.length === 0) {
    lines.push('Žádný event nemusel být snížen.');
  } else {
    for (const c of input.cappedEvents) {
      lines.push(
        `- **${c.id}**: severity ${c.from} → ${c.to} (${c.outletCount} unique outlet${c.outletCount === 1 ? '' : 's'})`,
      );
    }
  }
  lines.push('');

  // Self-audit
  lines.push('## Self-audit pass');
  lines.push('');
  if (!input.audit) {
    lines.push('_Auditor pass nebyl spuštěn (žádné events)._');
  } else {
    const counts = countBy(input.audit.per_event, (v) => v.verdict);
    lines.push(`- Pass: ${counts['pass'] ?? 0}`);
    lines.push(`- Flag: ${counts['flag'] ?? 0}`);
    lines.push(`- Downgrade → needs_review: ${counts['downgrade'] ?? 0}`);
    lines.push('');
    const flagged = input.audit.per_event.filter(
      (v) => v.verdict !== 'pass',
    );
    if (flagged.length > 0) {
      lines.push('### Auditor notes');
      lines.push('');
      for (const v of flagged) {
        lines.push(`- **${v.event_id}** (${v.verdict}): ${v.note}`);
      }
      lines.push('');
    }
    lines.push('### Aggregate');
    lines.push('');
    lines.push(`- **Direction asymmetry:** ${input.audit.aggregate.direction_asymmetry}`);
    lines.push(`- **Outlet concentration:** ${input.audit.aggregate.outlet_concentration}`);
    lines.push(`- **Pillar distribution:** ${input.audit.aggregate.pillar_distribution}`);
    lines.push(`- **Overall:** ${input.audit.aggregate.overall_assessment}`);
  }
  lines.push('');

  // Score change
  lines.push('## Score change');
  lines.push('');
  if (input.prevSnapshot) {
    const overallDelta = input.newSnapshot.overall_score - input.prevSnapshot.overall_score;
    lines.push(
      `- Overall: ${input.prevSnapshot.overall_score.toFixed(1)} → ${input.newSnapshot.overall_score.toFixed(1)} (${formatDelta(overallDelta)})`,
    );
    for (const p of PILLARS) {
      const delta = input.newSnapshot.pillars[p] - input.prevSnapshot.pillars[p];
      lines.push(
        `  - ${p}: ${input.prevSnapshot.pillars[p].toFixed(1)} → ${input.newSnapshot.pillars[p].toFixed(1)} (${formatDelta(delta)})`,
      );
    }
  } else {
    lines.push(`- Overall (first snapshot): ${input.newSnapshot.overall_score.toFixed(1)}`);
    for (const p of PILLARS) {
      lines.push(`  - ${p}: ${input.newSnapshot.pillars[p].toFixed(1)}`);
    }
  }
  lines.push('');

  // Anomalies
  lines.push('## Anomalies');
  lines.push('');
  if (input.anomalies.length === 0) {
    lines.push('_Žádné._');
  } else {
    for (const a of input.anomalies) {
      lines.push(`- **${a.trigger}** (${a.level}): ${a.details}`);
    }
  }
  lines.push('');

  // Per-event detail
  lines.push('## Per-event detail');
  lines.push('');
  for (const e of input.events) {
    lines.push(`### ${e.id} — ${e.headline}`);
    lines.push('');
    lines.push(`- **Date:** ${e.date}`);
    lines.push(
      `- **Pillar:** ${e.pillar} | **Severity:** ${e.severity ?? 'null'} | **Direction:** ${e.direction} | **Duration:** ${e.duration}`,
    );
    lines.push(`- **Status:** ${e.status} | **Score impact:** ${formatDelta(e.score_impact)}`);
    lines.push(
      `- **Sources:** ${e.sources.map((s) => `[${s.outlet}](${s.url})`).join(', ')}`,
    );
    lines.push('');
    lines.push(`**Summary.** ${e.summary}`);
    lines.push('');
    lines.push(`**Rationale.** ${e.rationale.replace(/\n/g, ' ')}`);
    lines.push('');
  }

  return lines.join('\n');
}

function countBy<T>(items: readonly T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function formatDistribution(dist: Record<string, number>, order: readonly string[]): string {
  const parts: string[] = [];
  for (const k of order) {
    parts.push(`${k}=${dist[k] ?? 0}`);
  }
  return parts.join(' · ');
}

function formatDelta(d: number): string {
  if (d === 0) return '±0.0';
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
}
