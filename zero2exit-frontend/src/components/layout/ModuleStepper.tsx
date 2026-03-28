"use client"

import { useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { Check, Circle, Lock } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"
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

function moduleDone(m: { status?: string } | undefined): boolean {
  return m?.status === "complete" || m?.status === "completed"
}

function buildProgress(
  m01Data: unknown,
  modulePlanData: { moduleProgress?: Array<{ moduleId: string; status?: string }> } | null | undefined
): Partial<FounderProgress> {
  const iv = (m01Data as { ideaValidation?: { scorecard?: unknown; marketSizing?: unknown; icpProfiles?: unknown } })?.ideaValidation
  const moduleProgress = modulePlanData?.moduleProgress ?? []

  const m02 = moduleProgress.find((m) => m.moduleId === "M02")
  const m03 = moduleProgress.find((m) => m.moduleId === "M03")
  const m04 = moduleProgress.find((m) => m.moduleId === "M04")
  const m06 = moduleProgress.find((m) => m.moduleId === "M06")

  return {
    ideaValidationComplete: !!iv?.scorecard,
    marketSizingComplete: !!iv?.marketSizing,
    icpProfilesComplete: !!iv?.icpProfiles,
    legalStructureComplete: moduleDone(m02),
    gtmComplete: moduleDone(m03),
    bpComplete: moduleDone(m06),
    brandingComplete: moduleDone(m04),
  }
}

export function ModuleStepper() {
  const pathname = usePathname()
  const locale = useLocale()
  const prefix = `/${locale}`
  const activeStageRef = useRef<HTMLDivElement | null>(null)

  const { data: m01Data } = trpc.m01.getState.useQuery(undefined, { retry: false })
  const { data: modulePlanData } = trpc.gateway.getModulePlan.useQuery(undefined, { retry: false })

  const progress: Partial<FounderProgress> = useMemo(
    () => buildProgress(m01Data, modulePlanData),
    [m01Data, modulePlanData]
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
                      className="flex min-h-[44px] touch-manipulation items-center gap-0.5 rounded px-2 py-1 text-[10px] leading-tight whitespace-nowrap text-slate-500 opacity-50 select-none md:min-h-0 md:px-1.5 md:py-0.5 md:text-[9px]"
                      aria-disabled="true"
                      role="status"
                      title={lockedTooltip}
                    >
                      <Lock className="h-3 w-3 shrink-0 md:h-2 md:w-2" />
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

          const href = stage.href ? `${prefix}${stage.href}` : null
          const isNavigable = (completed || isActive) && !!href

          const pillContent = (
            <>
              {completed ? (
                <Check className="h-3 w-3 shrink-0 md:h-2 md:w-2" aria-hidden />
              ) : (
                <Circle className="h-3 w-3 shrink-0 md:h-2 md:w-2" aria-hidden />
              )}
              {stage.label}
            </>
          )

          const pillClass = cn(
            "flex min-h-[44px] touch-manipulation items-center gap-0.5 rounded px-2 py-1 text-[10px] leading-tight whitespace-nowrap transition-colors md:min-h-0 md:px-1.5 md:py-0.5 md:text-[9px]",
            completed
              ? "cursor-pointer text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              : isActive
                ? "cursor-pointer bg-white/10 font-semibold text-white hover:bg-white/20"
                : "cursor-default text-slate-500"
          )

          return (
            <div
              key={stage.id}
              ref={isActive ? activeStageRef : undefined}
              className="flex items-center shrink-0 min-w-0"
            >
              {isNavigable ? (
                <Link href={href!} className={pillClass} aria-current={isActive ? "step" : undefined}>
                  {pillContent}
                </Link>
              ) : (
                <span className={pillClass} aria-current={isActive ? "step" : undefined}>
                  {pillContent}
                </span>
              )}
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
