/**
 * Stage configuration and progress resolution for the founder journey.
 * Used by the stage bar to reflect real progress from the backend.
 */

export type FounderProgress = {
  ideaValidationComplete: boolean
  marketSizingComplete: boolean
  icpProfilesComplete: boolean
  legalStructureComplete: boolean
  gtmComplete: boolean
  brandingComplete: boolean
}

export type StageId =
  | "idea-validation"
  | "market-sizing"
  | "icp-profiles"
  | "legal-structure"
  | "go-to-market"
  | "brand-identity"
  | "scaling"
  | "fundraising"
  | "exit"

export type StageDef = {
  id: StageId
  label: string
  /** Module key for progress resolution; absent when locked */
  module?: keyof FounderProgress
  locked?: boolean
  /** Route for "current" highlighting only; no navigation */
  href?: string
}

export const STAGES: StageDef[] = [
  { id: "idea-validation", label: "Idea Validation", module: "ideaValidationComplete", href: "/dashboard/m01" },
  { id: "market-sizing", label: "Market Sizing", module: "marketSizingComplete", href: "/dashboard/m01" },
  { id: "icp-profiles", label: "ICP Profiles", module: "icpProfilesComplete", href: "/dashboard/m01" },
  { id: "legal-structure", label: "Legal Structure", module: "legalStructureComplete", href: "/dashboard/m02" },
  { id: "go-to-market", label: "Go-To-Market", module: "gtmComplete", href: "/gtm" },
  { id: "brand-identity", label: "Brand Identity", module: "brandingComplete", href: "/brand" },
  { id: "scaling", label: "Scaling Strategy", locked: true },
  { id: "fundraising", label: "Fundraising Readiness", locked: true },
  { id: "exit", label: "Exit Planning", locked: true },
]

const STAGE_ORDER: StageId[] = [
  "idea-validation",
  "market-sizing",
  "icp-profiles",
  "legal-structure",
  "go-to-market",
  "brand-identity",
  "scaling",
  "fundraising",
  "exit",
]

/**
 * Resolves the founder's current stage from progress.
 * Returns the first stage that is not yet complete.
 * Locked stages are never "current"; the current stage is the first incomplete unlocked stage.
 * Safety: if progress is missing/incomplete, defaults to "idea-validation".
 */
export function getFounderStage(progress: Partial<FounderProgress> | null | undefined): StageId {
  if (!progress) return "idea-validation"

  if (!progress.ideaValidationComplete) return "idea-validation"
  if (!progress.marketSizingComplete) return "market-sizing"
  if (!progress.icpProfilesComplete) return "icp-profiles"
  if (!progress.legalStructureComplete) return "legal-structure"
  if (!progress.gtmComplete) return "go-to-market"
  if (!progress.brandingComplete) return "brand-identity"
  return "scaling"
}

export function getStageIndex(stageId: StageId): number {
  const i = STAGE_ORDER.indexOf(stageId)
  return i >= 0 ? i : 0
}

/**
 * Whether a stage is complete based on progress.
 * Locked stages are never complete.
 */
export function isStageComplete(
  stage: StageDef,
  progress: Partial<FounderProgress> | null | undefined
): boolean {
  if (stage.locked) return false
  if (!stage.module || !progress) return false
  return Boolean(progress[stage.module])
}
