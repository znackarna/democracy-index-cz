import { z } from 'zod';

export const PILLARS = ['electoral', 'governance', 'judicial', 'media', 'civil', 'corruption'] as const;

export const PILLAR_WEIGHTS = {
  electoral: 0.15,
  governance: 0.2,
  judicial: 0.2,
  media: 0.15,
  civil: 0.15,
  corruption: 0.15,
} as const satisfies Record<(typeof PILLARS)[number], number>;

export const PillarSchema = z.enum(PILLARS);
export type Pillar = z.infer<typeof PillarSchema>;

export const SeveritySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
export type Severity = z.infer<typeof SeveritySchema>;

export const DirectionSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]);
export type Direction = z.infer<typeof DirectionSchema>;

export const DurationSchema = z.enum(['one_off', 'persistent']);
export type Duration = z.infer<typeof DurationSchema>;

export const StatusSchema = z.enum(['active', 'resolved', 'disputed', 'needs_review']);
export type Status = z.infer<typeof StatusSchema>;

export const ReviewerSchema = z.enum(['manual', 'auto']);
export type Reviewer = z.infer<typeof ReviewerSchema>;

export const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  outlet: z.string().min(1),
  fetched_at: z.string().datetime(),
});
export type Source = z.infer<typeof SourceSchema>;

const EVENT_ID_PATTERN = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])-\d{3}$/;
const ISO_WEEK_PATTERN = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const QUARTER_PATTERN = /^\d{4}-Q[1-4]$/;

export const EventSchema = z
  .object({
    id: z.string().regex(EVENT_ID_PATTERN),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    headline: z.string().min(5).max(200),
    summary: z.string().min(20).max(600),
    pillar: PillarSchema,
    severity: SeveritySchema.nullable(),
    direction: DirectionSchema,
    duration: DurationSchema,
    sources: z.array(SourceSchema).min(1),
    score_impact: z.number().min(-6).max(6),
    rationale: z.string().min(20),
    reviewer: ReviewerSchema,
    status: StatusSchema,
    created_at: z.string().datetime(),
    expires_at: z.string().datetime().optional(),
  })
  .refine((e) => e.status !== 'active' || e.severity !== null, {
    message: 'active events must have a non-null severity',
    path: ['severity'],
  });
export type Event = z.infer<typeof EventSchema>;

const PillarScoreObject = z.object({
  electoral: z.number().min(0).max(100),
  governance: z.number().min(0).max(100),
  judicial: z.number().min(0).max(100),
  media: z.number().min(0).max(100),
  civil: z.number().min(0).max(100),
  corruption: z.number().min(0).max(100),
});
export type PillarScores = z.infer<typeof PillarScoreObject>;

export const StructuralBaselineSchema = z.object({
  quarter: z.string().regex(QUARTER_PATTERN),
  computed_at: z.string().datetime(),
  pillars: PillarScoreObject,
  sources: z
    .array(
      z.object({
        index: z.string().min(1),
        year: z.number().int().min(2000).max(2100),
        value: z.number(),
        pillar: PillarSchema.optional(),
        url: z.string().url(),
        notes: z.string().optional(),
      }),
    )
    .min(1),
  notes: z.string().optional(),
});
export type StructuralBaseline = z.infer<typeof StructuralBaselineSchema>;

export const ScoreSnapshotSchema = z.object({
  week: z.string().regex(ISO_WEEK_PATTERN),
  computed_at: z.string().datetime(),
  overall_score: z.number().min(0).max(100),
  pillars: PillarScoreObject,
  active_events_count: z.number().int().min(0),
  structural_baseline: z.string().regex(QUARTER_PATTERN),
});
export type ScoreSnapshot = z.infer<typeof ScoreSnapshotSchema>;

export const IsoWeekSchema = z.string().regex(ISO_WEEK_PATTERN);
export type IsoWeek = z.infer<typeof IsoWeekSchema>;

export const RawArticleSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  outlet: z.string().min(1),
  published_at: z.string().datetime().optional(),
  summary: z.string().optional(),
  fetched_at: z.string().datetime(),
});
export type RawArticle = z.infer<typeof RawArticleSchema>;

export const PreFilteredArticleSchema = RawArticleSchema.extend({
  candidate_pillar: PillarSchema.nullable(),
  reason_kept: z.string().min(1),
});
export type PreFilteredArticle = z.infer<typeof PreFilteredArticleSchema>;

// ============================================================
// Public opinion data — read-only display, NEVSTUPUJE do skóre.
// ============================================================

export const PollDataPointSchema = z.object({
  /** Identifikátor období (např. "2026-03"). */
  period: z.string().min(1),
  /** Lidsky čitelný popis terénní fáze sběru ("březen – duben 2026"). */
  fieldwork: z.string().min(1),
  /** ISO datum publikace zprávy. */
  publication: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** URL na konkrétní tiskovku, která tato data publikuje. */
  url: z.string().url(),
  /** Přerušení metodologie — zobrazí se varování v grafu. */
  methodology_break: z.boolean().optional(),
  /** Detail toho, co se v metodologii změnilo. */
  methodology_break_note: z.string().optional(),
  /** Mapa instituce → procento (0-100). Klíče odpovídají PollSeries.institution_labels. */
  values: z.record(z.string(), z.number().min(0).max(100)),
});
export type PollDataPoint = z.infer<typeof PollDataPointSchema>;

export const PollSeriesSchema = z.object({
  /** ID poller-u (cvvm | stem | median | eurobarometer | globsec). */
  source: z.string().min(1),
  /** Lidsky čitelný název pollera (zobrazení v UI). */
  source_label: z.string().min(1),
  /** Domovská stránka pollera (citation link). */
  source_url: z.string().url(),
  /** Identifikátor metriky (zatím jen "trust_pct"; rozšiřitelné na "corruption_pct" atp.). */
  metric: z.string().min(1),
  /** Lidsky čitelný popis metriky pro osu Y / tooltip. */
  metric_label: z.string().min(1),
  /** Maximum scale (typicky 100 pro percentage). */
  scale_max: z.number().positive(),
  /** Volitelně frekvence sběru — informace pro UI tooltip. */
  frequency: z.enum(['monthly', 'quarterly', 'biannual', 'annual', 'irregular']).optional(),
  /** Globální poznámka k metodologii (zobrazí se pod grafem). */
  methodology_note: z.string().optional(),
  /** Mapa institution_id → CZ display label. Klíče odpovídají values v každém datapointu. */
  institution_labels: z.record(z.string(), z.string()),
  /** Time series datapointy, sorted ascending by period. */
  data: z.array(PollDataPointSchema),
});
export type PollSeries = z.infer<typeof PollSeriesSchema>;

export const TopicalFindingSchema = z.object({
  source: z.string().min(1),
  source_label: z.string().min(1),
  source_homepage: z.string().url(),
  /** ISO datum publikace nálezu. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Krátký název tématu (3-8 slov). */
  topic: z.string().min(3),
  /** Headline finding (1-3 věty parafrázovaná). */
  headline: z.string().min(20),
  /** URL na originální zprávu. */
  url: z.string().url(),
  /** Které z našich pilířů toto téma týká (volitelně, pro filtrování). */
  pillars_relevant: z.array(PillarSchema).optional(),
});
export type TopicalFinding = z.infer<typeof TopicalFindingSchema>;

export const TopicalFindingsFileSchema = z.object({
  metric_label: z.string().min(1),
  description: z.string().min(1),
  items: z.array(TopicalFindingSchema),
});
export type TopicalFindingsFile = z.infer<typeof TopicalFindingsFileSchema>;
