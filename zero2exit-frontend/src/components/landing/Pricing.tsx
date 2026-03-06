import Link from "next/link"
import { RevealOnScroll } from "./RevealOnScroll"

const plans = [
  {
    name: "Launch",
    price: 149,
    desc: "For early-stage founders validating their idea and setting up their legal foundation.",
    features: [
      { text: "M01 — Idea Validation", included: true },
      { text: "M02 — Legal Engine (1 jurisdiction)", included: true },
      { text: "AI Coach (50 queries/mo)", included: true },
      { text: "Document generation (5 docs)", included: true },
      { text: "M03–M06 Modules", included: false },
      { text: "Bilingual AR/EN content", included: false },
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    name: "Scale",
    price: 349,
    desc: "For seed-stage founders building, launching, and growing their business with AI.",
    features: [
      { text: "All M01–M05 Modules active", included: true },
      { text: "AI Coach (unlimited)", included: true },
      { text: "30+ jurisdictions access", included: true },
      { text: "Bilingual AR/EN content engine", included: true },
      { text: "Dev Partner marketplace", included: true },
      { text: "Financial model + scenarios", included: true },
    ],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Exit",
    price: 749,
    desc: "Full platform access for growth-stage companies on the path to fundraising or acquisition.",
    features: [
      { text: "All 6 Modules — full access", included: true },
      { text: "M06 — Scale & Exit Engine", included: true },
      { text: "Pitch deck builder & data room", included: true },
      { text: "Investor & mentor network", included: true },
      { text: "Dedicated AI Coach context", included: true },
      { text: "Priority support & onboarding", included: true },
    ],
    cta: "Contact Sales",
    featured: false,
  },
]

export function Pricing() {
  return (
    <div id="pricing" className="bg-z-deep border-t border-b border-z-border py-16 md:py-[100px]">
      <RevealOnScroll className="max-w-[1300px] mx-auto px-6 md:px-15">
        <div className="font-code text-[11px] font-bold tracking-[2.5px] uppercase text-z-gold mb-4">
          Pricing
        </div>
        <h2 className="font-display text-[clamp(32px,4vw,52px)] font-bold text-z-white leading-[1.1] tracking-[-1px]">
          Invest Once.<br />Build Forever.
        </h2>
        <p className="text-[17px] text-z-muted leading-[1.7] max-w-[520px] mt-4 font-light">
          One platform replaces your consultants, lawyers, and agencies. The ROI begins on day one.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 relative transition-all duration-300 hover:-translate-y-1 ${
                plan.featured
                  ? "bg-gradient-to-br from-z-card to-[rgba(201,168,76,0.05)] border border-z-gold"
                  : "bg-z-card border border-z-border"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-z-gold text-z-black text-[10px] font-extrabold tracking-[1.5px] px-4 py-1 rounded-b-lg">
                  MOST POPULAR
                </div>
              )}

              <div className="font-code text-[11px] font-semibold tracking-[2px] text-z-muted mb-3 uppercase">
                {plan.name}
              </div>
              <div className="font-display text-5xl font-bold text-z-white leading-none">
                <sup className="text-xl align-top mt-2 inline-block">$</sup>
                {plan.price}
                <span className="text-base text-z-muted font-body font-normal">/mo</span>
              </div>
              <p className="text-sm text-z-muted mt-2 mb-7 leading-[1.6]">{plan.desc}</p>

              <div className="flex flex-col gap-2.5 mb-7">
                {plan.features.map((feat) => (
                  <div
                    key={feat.text}
                    className={`flex items-center gap-2.5 text-[13px] ${
                      feat.included ? "text-z-text" : "text-z-muted"
                    }`}
                  >
                    <span className={`font-bold shrink-0 ${feat.included ? "text-z-green" : "text-z-muted"}`}>
                      {feat.included ? "✓" : "✕"}
                    </span>
                    {feat.text}
                  </div>
                ))}
              </div>

              <Link
                href="/en/sign-up"
                className={`block w-full text-center py-3.5 rounded-lg font-body font-bold text-[15px] transition-all duration-250 ${
                  plan.featured
                    ? "bg-z-gold text-z-black border border-z-gold hover:bg-z-gold-light hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(201,168,76,0.3)]"
                    : "bg-transparent text-z-text border border-z-border hover:border-z-gold hover:text-z-gold"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </RevealOnScroll>
    </div>
  )
}
