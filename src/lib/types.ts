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
