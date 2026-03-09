"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

type OpenCoachContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  initialPrompt: string
  clearInitialPrompt: () => void
  /** Open the floating AI Coach, optionally with a pre-filled prompt (e.g. from an insight card). */
  openCoach: (prompt?: string) => void
}

const OpenCoachContext = createContext<OpenCoachContextValue | null>(null)

export function OpenCoachProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState("")

  const clearInitialPrompt = useCallback(() => setInitialPrompt(""), [])

  const openCoach = useCallback(
    (prompt?: string) => {
      setInitialPrompt(prompt ?? "")
      setOpen(true)
    },
    []
  )

  return (
    <OpenCoachContext.Provider
      value={{
        open,
        setOpen,
        initialPrompt,
        clearInitialPrompt,
        openCoach,
      }}
    >
      {children}
    </OpenCoachContext.Provider>
  )
}

export function useOpenCoach(): OpenCoachContextValue {
  const ctx = useContext(OpenCoachContext)
  if (!ctx) {
    throw new Error("useOpenCoach must be used within OpenCoachProvider")
  }
  return ctx
}
