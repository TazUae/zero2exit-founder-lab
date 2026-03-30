"use client"

import { useState } from "react"
import { RevealOnScroll } from "./RevealOnScroll"
import { FadeUpSection } from "../motion/primitives"

const steps = [
  { icon: "🧭", label: "Onboarding\nGateway", tag: "MANDATORY", tagStyle: "bg-[rgba(62,207,142,0.12)] text-z-green" },
  { icon: "💡", label: "Idea & Market\nValidation", tag: "M01", tagStyle: "bg-[rgba(62,207,142,0.12)] text-z-green" },
  { icon: "⚖️", label: "Legal\nStructure", tag: "M02", tagStyle: "bg-z-gold-dim text-z-gold" },
  { icon: "📣", label: "GTM, Brand\n& Marketing", tag: "M03", tagStyle: "bg-[rgba(62,207,142,0.12)] text-z-green" },
  { icon: "🚀", label: "MVP &\nSoft Launch", tag: "M04", tagStyle: "bg-[rgba(62,207,142,0.12)] text-z-green" },
  { icon: "⚙️", label: "Automation\n& ERP", tag: "M05", tagStyle: "bg-[rgba(79,156,249,0.12)] text-z-blue" },
  { icon: "🏆", label: "Scale &\nExit Planning", tag: "M06", tagStyle: "bg-[rgba(79,156,249,0.12)] text-z-blue" },
]

export function Journey() {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <FadeUpSection id="journey" className="py-24">
      <RevealOnScroll className="max-w-7xl mx-auto px-6">
        <div className="font-code text-[11px] font-bold tracking-[2.5px] uppercase text-z-gold mb-4">
          The Founder Journey
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-z-white leading-tight">
          Every Stage.<br />Every Decision. Covered.
        </h2>
        <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-[520px] mt-4 font-light">
          The platform enforces the correct module sequence — so you never waste time on irrelevant stages.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mt-16 relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-9 left-[6%] right-[6%] h-0.5 bg-gradient-to-r from-transparent via-z-gold to-transparent opacity-30" />

          {steps.map((step, i) => (
            <button
              key={step.tag}
              onClick={() => setActiveStep(i)}
              className={`flex flex-col items-center gap-3 relative cursor-pointer p-4 transition-transform duration-250 hover:-translate-y-1 bg-transparent border-none`}
            >
              <div
                className={`w-[72px] h-[72px] rounded-full border-2 flex items-center justify-center text-2xl transition-all duration-300 ${
                  activeStep === i
                    ? "border-z-gold bg-z-gold-dim text-z-gold-light shadow-[0_0_30px_rgba(201,168,76,0.2)]"
                    : "border-z-border bg-z-card text-z-muted hover:border-z-gold hover:bg-z-gold-dim hover:text-z-gold-light"
                }`}
              >
                <span>{step.icon}</span>
              </div>
              <div className="text-xs font-medium text-z-muted text-center leading-[1.4] whitespace-pre-line">
                {step.label}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-[0.5px] ${step.tagStyle}`}>
                {step.tag}
              </span>
            </button>
          ))}
        </div>
      </RevealOnScroll>
    </FadeUpSection>
  )
}
