import { z } from 'zod'

// ── Stress Test / Objections ────────────────────────────────────────────────

export const ObjectionSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string(),
  severity: z.string(),
  mitigationStrategy: z.string().optional(),
}).passthrough()

export const StressTestOutputSchema = z.object({
  objections: z.array(ObjectionSchema).default([]),
  risks: z.array(z.string()).default([]),
  suggestedImprovements: z.array(z.string()).default([]),
  validationScore: z.coerce.number().min(0).max(100).optional(),
}).passthrough()

export type StressTestOutput = z.infer<typeof StressTestOutputSchema>

// ── Market Sizing ───────────────────────────────────────────────────────────

const MarketTierSchema = z.object({
  value: z.union([z.string(), z.number()]),
  numericValue: z.coerce.number().optional(),
  description: z.string().optional(),
  methodology: z.string().optional(),
}).passthrough()

export const MarketSizingOutputSchema = z.object({
  tam: MarketTierSchema.optional(),
  sam: MarketTierSchema.optional(),
  som: MarketTierSchema.optional(),
  growthRate: z.string().optional(),
  sources: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
}).passthrough()

export type MarketSizingOutput = z.infer<typeof MarketSizingOutputSchema>

// ── ICP Profiles ────────────────────────────────────────────────────────────

const ICPProfileSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  painPoints: z.array(z.string()).default([]),
  willingnessToPay: z.string().optional(),
  channels: z.array(z.string()).default([]),
}).passthrough()

export const ICPOutputSchema = z.object({
  profiles: z.array(ICPProfileSchema).default([]),
}).passthrough()

export type ICPOutput = z.infer<typeof ICPOutputSchema>

// ── Scorecard ───────────────────────────────────────────────────────────────

const ScorecardDimensionSchema = z.object({
  name: z.string().optional(),
  score: z.coerce.number().min(0).max(100).optional(),
  rationale: z.string().optional(),
  tips: z.string().optional(),
  risks: z.array(z.string()).default([]),
}).passthrough()

export const ScorecardOutputSchema = z.object({
  total: z.coerce.number().min(0).max(100).optional(),
  breakdown: z.record(z.string(), z.coerce.number()).optional(),
  dimensions: z.array(ScorecardDimensionSchema).default([]),
  summary: z.string().optional(),
  passedValidation: z.boolean().optional(),
}).passthrough()

export type ScorecardOutput = z.infer<typeof ScorecardOutputSchema>

// ── Competitor Snapshot ─────────────────────────────────────────────────────

const CompetitorEntrySchema = z.object({
  name: z.string(),
  strength: z.string(),
  weakness: z.string(),
}).passthrough()

export const CompetitorSnapshotOutputSchema = z.object({
  competitors: z.array(CompetitorEntrySchema).default([]),
}).passthrough()

export type CompetitorSnapshotOutput = z.infer<typeof CompetitorSnapshotOutputSchema>

// ── Gateway Classification ──────────────────────────────────────────────────

export const GatewayClassifyOutputSchema = z.object({
  stage: z.string(),
  rationale: z.string().optional(),
}).passthrough()

export type GatewayClassifyOutput = z.infer<typeof GatewayClassifyOutputSchema>
