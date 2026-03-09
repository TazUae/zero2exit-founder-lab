'use client'

import { useRef, useEffect } from "react"
import { Zap } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { CoachClient } from "@/app/[locale]/(dashboard)/coach/CoachClient"
import { useOpenCoach } from "@/lib/open-coach-context"
import { cn } from "@/lib/utils"

export function FloatingCoachButton() {
  const { open, setOpen, initialPrompt, clearInitialPrompt, openCoach } = useOpenCoach()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const sheetContentRef = useRef<HTMLDivElement>(null)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      clearInitialPrompt()
      requestAnimationFrame(() => {
        triggerRef.current?.focus({ preventScroll: true })
      })
    }
  }

  useEffect(() => {
    if (open && sheetContentRef.current) {
      const focusable = sheetContentRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      requestAnimationFrame(() => focusable?.focus({ preventScroll: true }))
    }
  }, [open])

  return (
    <TooltipProvider delayDuration={300}>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => openCoach()}
              aria-label="Open AI Coach"
              aria-expanded={open}
              className={cn(
                "fixed bottom-6 right-6 z-[45]",
                "flex items-center justify-center",
                "w-14 h-14 rounded-full shadow-lg",
                "bg-emerald-500 hover:bg-emerald-600",
                "border border-emerald-400/30",
                "text-white",
                "transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                "active:scale-95",
                "md:bottom-8 md:right-8 md:w-[3.25rem] md:h-[3.25rem]"
              )}
            >
              <Zap className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            sideOffset={12}
            className="bg-slate-800 border-slate-700 text-slate-100"
          >
            <span className="font-medium">AI Coach</span>
            <span className="block text-xs text-slate-400 mt-0.5">
              Context-aware guidance for your roadmap
            </span>
          </TooltipContent>
        </Tooltip>

        <SheetContent
          side="right"
          showCloseButton={true}
          onEscapeKeyDown={() => handleOpenChange(false)}
          onPointerDownOutside={() => handleOpenChange(false)}
          className={cn(
            "flex flex-col p-0 gap-0 w-full sm:max-w-md md:max-w-lg",
            "inset-y-0 right-0 h-full",
            "border-l border-slate-800 bg-slate-950",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          )}
        >
          <SheetTitle className="sr-only">AI Coach</SheetTitle>
          <div ref={sheetContentRef} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="shrink-0 border-b border-slate-800 px-4 py-3 bg-slate-900/50">
              <p className="text-sm font-semibold text-white">AI Coach</p>
              <p className="text-xs text-slate-400 mt-0.5">Part of your Command Center</p>
            </div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden pt-4 px-4">
              <CoachClient
                embedded
                initialPrompt={initialPrompt}
                onInitialPromptConsumed={clearInitialPrompt}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}
