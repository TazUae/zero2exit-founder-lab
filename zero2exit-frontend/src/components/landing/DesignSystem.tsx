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
    <section className="py-24">
      <RevealOnScroll className="max-w-7xl mx-auto px-6">
        <div className="font-code text-[11px] font-bold tracking-[2.5px] uppercase text-z-gold mb-4">
          Platform Experience
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-z-white leading-tight">
          Designed for Founders,<br />Not Accountants.
        </h2>
        <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-[520px] mt-4 font-light">
          Every interaction principle is built around reducing cognitive load and celebrating progress.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm shadow-lg p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
                <div className="text-[28px] mb-4">{card.icon}</div>
                <h4 className="text-xl font-semibold text-z-text">{card.title}</h4>
                <p className="mt-2 text-base md:text-lg text-slate-300 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  )
}
