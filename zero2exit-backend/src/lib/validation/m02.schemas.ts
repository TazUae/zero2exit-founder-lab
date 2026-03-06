import { z } from 'zod'

// ── Jurisdiction Comparison ──────────────────────────────────────────────────
// Matches the JSON format defined in m02.jurisdiction.ts prompt

const JurisdictionItemSchema = z
  .object({
    name: z.string(),
    country: z.string(),
    type: z.string(),
    setupCost: z.string(),
    setupTimeline: z.string(),
    foreignOwnership: z.string(),
    taxTreatment: z.string(),
    bestFor: z.string(),
    watchOut: z.string(),
    trustScore: z.coerce.number(),
  })
  .passthrough()

export const JurisdictionComparisonSchema = z
  .object({
    jurisdictions: z.array(JurisdictionItemSchema).min(1),
    recommendation: z.string(),
    recommendationRationale: z.string(),
  })
  .passthrough()

export type JurisdictionComparison = z.infer<
  typeof JurisdictionComparisonSchema
>

// ── Entity Recommendation ────────────────────────────────────────────────────
// Matches the JSON format defined in m02.entityRecommendation.ts prompt

const AlternativeEntitySchema = z
  .object({
    entity: z.string(),
    jurisdiction: z.string(),
    reason: z.string(),
  })
  .passthrough()

export const EntityRecommendationSchema = z
  .object({
    recommendedEntity: z.string(),
    recommendedJurisdiction: z.string(),
    confidenceScore: z.coerce.number().min(0).max(100),
    rationale: z.string(),
    alternatives: z.array(AlternativeEntitySchema).default([]),
    clarifyingQuestions: z.array(z.string()).default([]),
  })
  .passthrough()

export type EntityRecommendation = z.infer<typeof EntityRecommendationSchema>

// ── Legal Roadmap ────────────────────────────────────────────────────────────
// Matches the JSON format defined in m02.legalRoadmap.ts prompt

const RoadmapStepSchema = z
  .object({
    stage: z.string(),
    timing: z.string(),
    action: z.string(),
    trigger: z.string(),
    estimatedCost: z.string(),
    priority: z.string(),
  })
  .passthrough()

export const LegalRoadmapSchema = z
  .object({
    roadmap: z.array(RoadmapStepSchema).min(1),
    totalEstimatedCost: z.string(),
    criticalWarnings: z.array(z.string()).default([]),
  })
  .passthrough()

export type LegalRoadmap = z.infer<typeof LegalRoadmapSchema>
