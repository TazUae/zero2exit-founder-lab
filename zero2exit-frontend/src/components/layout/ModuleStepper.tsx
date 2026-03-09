"use client"

import { useRef, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { Check, Circle, Lock } from "lucide-react"
import { trpc } from "@/lib/trpc"
import {
  STAGES,
  getFounderStage,
  getStageIndex,
  isStageComplete,
  type FounderProgress,
} from "@/lib/stage-progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

function buildProgress(
  m01Data: unknown,
  modulePlanData: { moduleProgress?: Array<{ moduleId: string; status?: string }> } | null | undefined
): Partial<FounderProgress> {
  const iv = (m01Data as { ideaValidation?: { scorecard?: unknown; marketSizing?: unknown; icpProfiles?: unknown } })?.ideaValidation
  const moduleProgress = modulePlanData?.moduleProgress ?? []

  const m02 = moduleProgress.find((m) => m.moduleId === "M02")
  const m03 = moduleProgress.find((m) => m.moduleId === "M03")
  const m02Done = m02?.status === "complete" || m02?.status === "completed"
  const m03Done = m03?.status === "complete" || m03?.status === "completed"

  return {
    ideaValidationComplete: !!iv?.scorecard,
    marketSizingComplete: !!iv?.marketSizing,
    icpProfilesComplete: !!iv?.icpProfiles,
    legalStructureComplete: m02Done,
    gtmComplete: m03Done,
    brandingComplete: false,
  }
}

export function ModuleStepper() {
  const pathname = usePathname()
  const locale = useLocale()
  const prefix = `/${locale}`
  const activeStageRef = useRef<HTMLDivElement | null>(null)

  const { data: m01Data } = trpc.m01.getState.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  })

  const { data: modulePlanData } = trpc.gateway.getModulePlan.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  })

  // tRPC inferred return type is excessively deep — narrow to unknown before useMemo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m01DataNarrow = m01Data as any
  const progress: Partial<FounderProgress> = useMemo(
    () => buildProgress(m01DataNarrow, modulePlanData),
    [m01DataNarrow, modulePlanData]
  ) as Partial<FounderProgress>

  const progressStageId = getFounderStage(progress)
  const progressCurrentIndex = getStageIndex(progressStageId)

  const pathnameIndex = STAGES.findIndex((s) => {
    if (s.locked || !s.href) return false
    const full = `${prefix}${s.href}`
    return pathname === full || pathname.startsWith(full + "/")
  })

  const currentIndex = pathnameIndex >= 0 ? pathnameIndex : progressCurrentIndex

  useEffect(() => {
    activeStageRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }, [currentIndex])

  const lockedTooltip = "Available in a future stage"
  const completedCount = STAGES.filter((s) => isStageComplete(s, progress)).length

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full border-b border-slate-800 bg-slate-900/50">
        <p className="text-[10px] text-slate-500 text-center pt-2 pb-0.5 px-2" aria-hidden>
          Founder Journey
        </p>
        <div
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={STAGES.length}
          aria-label="Founder journey progress"
          className="w-full flex items-center justify-center gap-px py-1.5 px-2 overflow-x-auto overflow-y-hidden flex-nowrap min-w-0 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
        {STAGES.map((stage, i) => {
          const completed = isStageComplete(stage, progress)
          const isActive = !stage.locked && i === currentIndex

          if (stage.locked) {
            return (
              <div
                key={stage.id}
                className="flex items-center shrink-0 min-w-0"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-tight whitespace-nowrap opacity-50 cursor-default select-none text-slate-500"
                      aria-disabled="true"
                      role="status"
                    >
                      <Lock className="h-2 w-2 shrink-0" />
                      {stage.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-800 text-slate-200 border border-slate-700">
                    {lockedTooltip}
                  </TooltipContent>
                </Tooltip>
                {i < STAGES.length - 1 && (
                  <span className="text-slate-600 mx-px text-[8px] shrink-0" aria-hidden>›</span>
                )}
              </div>
            )
          }

          return (
            <div
              key={stage.id}
              ref={isActive ? activeStageRef : undefined}
              className="flex items-center shrink-0 min-w-0"
            >
              <span
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] leading-tight whitespace-nowrap cursor-default ${
                  completed
                    ? "text-emerald-400"
                    : isActive
                      ? "bg-white/10 font-semibold text-white"
                      : "text-slate-500"
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                {completed ? (
                  <Check className="h-2 w-2 shrink-0" aria-hidden />
                ) : (
                  <Circle className="h-2 w-2 shrink-0" aria-hidden />
                )}
                {stage.label}
              </span>
              {i < STAGES.length - 1 && (
                <span className="text-slate-600 mx-px text-[8px] shrink-0" aria-hidden>›</span>
              )}
            </div>
          )
        })}
        </div>
        <p className="text-[10px] text-slate-500 text-center py-1.5 px-2" aria-hidden>
          {completedCount} / {STAGES.length} stages completed
        </p>
      </div>
    </TooltipProvider>
  )
}
