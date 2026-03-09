 'use client'

import { useState, useRef, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Send, Loader2, Zap, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_PROMPTS = [
  "What should I focus on this week?",
  "How do I validate my pricing?",
  "What are the biggest risks in my business right now?",
  "How should I approach my first 10 customers?",
  "Should I raise funding or stay bootstrapped?",
]

export function CoachClient({
  embedded,
  initialPrompt,
  onInitialPromptConsumed,
}: {
  embedded?: boolean
  initialPrompt?: string
  onInitialPromptConsumed?: () => void
} = {}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(() =>
    embedded && initialPrompt?.trim() ? initialPrompt.trim() : ""
  )
  const [sessionId, setSessionId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMessage = trpc.coach.sendMessage.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ])
    },
    onError: () => {
      toast.error("Failed to get a response. Please try again.")
      setMessages((prev) => prev.slice(0, -1))
    },
  })

  const { data: suggestionsData } = trpc.coach.getProactiveSuggestions.useQuery()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (embedded && initialPrompt?.trim()) {
      onInitialPromptConsumed?.()
    }
  }, [embedded, initialPrompt, onInitialPromptConsumed])

  function handleSend() {
    if (!input.trim() || sendMessage.isPending) return
    const userMessage = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    sendMessage.mutate({ message: userMessage, sessionId })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSuggestedPrompt(prompt: string) {
    setInput(prompt)
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className={cn(
        "flex flex-col min-h-0",
        embedded ? "h-full" : "h-[calc(100vh-14rem)]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">AI Coach</h1>
          <p className="text-xs text-slate-400">
            Powered by Kimi K2.5 · Context-aware · Bilingual
          </p>
        </div>
      </div>

      {/* Chat area - min-h-0 lets this shrink so input stays visible */}
      <ScrollArea className="flex-1 min-h-0 pr-2">
        {isEmpty ? (
          <div className="space-y-6 py-4">
            {/* Welcome message */}
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
                <p className="text-slate-200 text-sm leading-relaxed">
                  Hey! I&apos;m your AI coach on Zero2Exit. I know your stage,
                  your progress, and your validation results. Ask me anything
                  about your startup journey.
                </p>
              </div>
            </div>

            {/* Proactive suggestions */}
            {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 flex items-center gap-1.5 px-1">
                  <Lightbulb className="w-3 h-3" /> Suggested for you
                </p>
                {suggestionsData.suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestedPrompt(s.title)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-800 transition-colors"
                  >
                    <p className="text-sm text-white font-medium">{s.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Quick prompts */}
            <div className="space-y-2">
              <p className="text-xs text-slate-500 px-1">Quick questions</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" && "flex-row-reverse"
                )}
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs",
                      msg.role === "assistant"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-300"
                    )}
                  >
                    {msg.role === "assistant" ? "AI" : "Y"}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "assistant"
                      ? "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm"
                      : "bg-emerald-500/10 border border-emerald-500/20 text-white rounded-tr-sm"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {sendMessage.isPending && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span className="text-xs text-slate-400">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area - always visible at bottom */}
      <div className="mt-3 flex gap-2 items-end flex-shrink-0">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach anything... (Enter to send, Shift+Enter for new line)"
          className="flex-1 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 resize-none min-h-[52px] max-h-[200px]"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || sendMessage.isPending}
          className="bg-emerald-500 hover:bg-emerald-600 h-[52px] w-[52px] p-0 flex-shrink-0"
        >
          {sendMessage.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
