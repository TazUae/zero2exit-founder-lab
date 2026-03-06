"use client"

import { useState } from "react"
import { RevealOnScroll } from "./RevealOnScroll"

const engineSteps = [
  { num: "01", title: "INGEST", desc: "Founder completes the 12–18 question gateway questionnaire before account creation." },
  { num: "02", title: "CLASSIFY", desc: "AI scores responses across 6 dimensions: stage, industry, funding status, team size, jurisdiction, and exit horizon." },
  { num: "03", title: "ROUTE", desc: "A founder stage is assigned and an ordered module activation plan is generated — unique to you." },
  { num: "04", title: "ACTIVATE", desc: "Your personalised journey dashboard renders with AI Coach pre-loaded with all your context." },
  { num: "05", title: "RE-EVALUATE", desc: "Engine re-scores every 30 days and after each module completion. Your plan evolves as you grow." },
]

const stageCards = [
  { icon: "🌱", name: "Idea Stage", desc: "No product, no entity yet", pips: ["active","active","active","locked","locked","locked"] },
  { icon: "🌿", name: "Pre-Seed Stage", desc: "Validated idea, early development", pips: ["optional","active","active","active","locked","locked"] },
  { icon: "🚀", name: "Seed / MVP Stage", desc: "Entity formed, MVP in progress", pips: ["optional","active","active","active","active","locked"] },
  { icon: "📈", name: "Early Growth", desc: "Revenue generating, team hired", pips: ["locked","active","active","active","active","optional"] },
  { icon: "🏆", name: "Scale / Pre-Exit", desc: "Series A+, active exit horizon", pips: ["locked","active","locked","locked","active","active"] },
]

const pipStyles: Record<string, string> = {
  active: "bg-[rgba(62,207,142,0.2)] text-z-green border border-[rgba(62,207,142,0.3)]",
  locked: "bg-z-border text-z-muted opacity-50",
  optional: "bg-[rgba(79,156,249,0.15)] text-z-blue border border-[rgba(79,156,249,0.3)]",
}

export function AIEngine() {
  const [highlighted, setHighlighted] = useState(1)

  return (
    <div id="engine" className="bg-z-deep border-t border-b border-z-border py-16 md:py-[100px]">
      <RevealOnScroll className="max-w-[1300px] mx-auto px-6 md:px-15 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        {/* Left column */}
        <div>
          <div className="font-code text-[11px] font-bold tracking-[2.5px] uppercase text-z-gold mb-4">
            AI Routing Engine
          </div>
          <h2 className="font-display text-[clamp(32px,4vw,52px)] font-bold text-z-white leading-[1.1] tracking-[-1px]">
            Intelligence that adapts to <em className="italic text-z-gold">your</em> stage.
          </h2>
          <p className="text-[17px] text-z-muted leading-[1.7] max-w-[520px] mt-4 font-light">
            The AI Routing Engine processes your onboarding questionnaire and creates a personalised module activation plan — re-evaluating every 30 days as your business evolves.
          </p>
          <div className="flex flex-col mt-10">
            {engineSteps.map((step) => (
              <div key={step.num} className="flex gap-5 py-6 border-b border-z-border last:border-b-0 cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-z-gold-dim border border-z-gold text-z-gold font-code text-xs font-semibold flex items-center justify-center shrink-0">
                  {step.num}
                </div>
                <div>
                  <h4 className="text-[15px] font-semibold text-z-text mb-1 transition-colors duration-200 group-hover:text-z-gold">
                    {step.title}
                  </h4>
                  <p className="text-[13px] text-z-muted leading-[1.6]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column - visual */}
        <div className="bg-z-card border border-z-border rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute -top-1/2 -right-[30%] w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.08),transparent_70%)]" />

          <div className="flex items-center gap-3 mb-7 relative">
            <div className="w-2 h-2 rounded-full bg-z-green" />
            <div className="w-2 h-2 rounded-full bg-z-red" />
            <div className="w-2 h-2 rounded-full bg-z-gold" />
            <span className="font-code text-xs text-z-muted">AI Stage Routing — Live Preview</span>
          </div>

          <div className="flex flex-col gap-2.5 relative">
            {stageCards.map((card, i) => (
              <button
                key={card.name}
                onClick={() => setHighlighted(i)}
                className={`bg-z-deep border rounded-[10px] px-4 py-3.5 flex items-center justify-between transition-all duration-300 cursor-pointer w-full text-left ${
                  highlighted === i
                    ? "border-z-gold bg-z-gold-dim"
                    : "border-z-border hover:border-z-gold"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{card.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-z-text">{card.name}</div>
                    <div className="text-[11px] text-z-muted mt-0.5">{card.desc}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {card.pips.map((pip, j) => (
                    <div
                      key={j}
                      className={`w-[22px] h-[22px] rounded text-[9px] font-bold flex items-center justify-center font-code ${pipStyles[pip]}`}
                    >
                      M{j + 1}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-3 flex-wrap relative">
            <div className="flex items-center gap-1.5 text-[11px] text-z-muted">
              <div className="w-3 h-3 rounded-sm bg-[rgba(62,207,142,0.2)] border border-[rgba(62,207,142,0.4)]" />
              Active
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-z-muted">
              <div className="w-3 h-3 rounded-sm bg-[rgba(79,156,249,0.15)] border border-[rgba(79,156,249,0.4)]" />
              Optional Audit
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-z-muted">
              <div className="w-3 h-3 rounded-sm bg-z-border" />
              Locked
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  )
}
