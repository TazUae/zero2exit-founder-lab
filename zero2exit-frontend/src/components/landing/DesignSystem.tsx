import { RevealOnScroll } from "./RevealOnScroll"

const cards = [
  { icon: "🤖", title: "AI-First UX", desc: "Every major output includes an AI explanation. Raw data is never shown without narrative context. The AI Coach is always one click away." },
  { icon: "🎉", title: "Celebrate Progress", desc: "Module completion triggers micro-animations and shareable milestone cards. Every win is acknowledged — nothing goes unnoticed." },
  { icon: "💾", title: "Autosave Always On", desc: "All inputs autosave every 30 seconds. No data is ever lost on navigation or browser close. Peace of mind, always." },
  { icon: "🌐", title: "Bilingual AR/EN", desc: "Full RTL (Right-to-Left) support for Arabic. All AI-generated content produced in both languages simultaneously." },
  { icon: "📱", title: "Mobile-First", desc: "Fully responsive. Sidebar collapses to a bottom navigation bar on mobile. The onboarding questionnaire is single-question-per-screen on mobile." },
  { icon: "♿", title: "WCAG 2.1 AA", desc: "Full accessibility compliance. Keyboard navigable, screen reader support, 4.5:1 contrast ratios, and aria-live form error regions." },
]

export function DesignSystem() {
  return (
    <section className="py-16 md:py-[100px] px-6 md:px-15 max-w-[1300px] mx-auto">
      <RevealOnScroll>
        <div className="font-code text-[11px] font-bold tracking-[2.5px] uppercase text-z-gold mb-4">
          Platform Experience
        </div>
        <h2 className="font-display text-[clamp(32px,4vw,52px)] font-bold text-z-white leading-[1.1] tracking-[-1px]">
          Designed for Founders,<br />Not Accountants.
        </h2>
        <p className="text-[17px] text-z-muted leading-[1.7] max-w-[520px] mt-4 font-light">
          Every interaction principle is built around reducing cognitive load and celebrating progress.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-z-card border border-z-border rounded-xl p-7 transition-all duration-300 hover:border-z-gold hover:-translate-y-[3px]"
            >
              <div className="text-[28px] mb-4">{card.icon}</div>
              <h4 className="text-base font-bold text-z-text mb-2">{card.title}</h4>
              <p className="text-[13px] text-z-muted leading-[1.6]">{card.desc}</p>
            </div>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  )
}
