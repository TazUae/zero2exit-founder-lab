import Link from "next/link"

const stats = [
  { value: "6", accent: "+", label: "Core Modules" },
  { value: "30", accent: "+", label: "Jurisdictions Covered" },
  { value: "100", accent: "%", label: "AI-Personalised" },
  { value: "AR", accent: " / EN", label: "Bilingual by Default" },
  { value: "0", accent: "→∞", label: "Idea to Series A+" },
]

export function Hero() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[100px] pb-[60px] md:px-10 md:pt-[120px] md:pb-20 relative overflow-hidden">
      {/* Background gradients */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(201,168,76,0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(79,156,249,0.06) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(155,111,247,0.06) 0%, transparent 60%)",
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black 0%, transparent 80%)",
        }}
      />

      {/* Badge */}
      <div className="animate-fade-up relative inline-flex items-center gap-2 border border-z-gold bg-z-gold-dim text-z-gold-light text-xs font-semibold tracking-[1.2px] uppercase px-4 py-1.5 rounded-full mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-z-gold animate-pulse-dot" />
        AI-Powered Founder Operating System
      </div>

      {/* Headline */}
      <h1 className="animate-fade-up-d1 relative font-display font-black text-[clamp(48px,7vw,96px)] leading-[1.0] tracking-[-2px] text-z-white max-w-[900px]">
        From{" "}
        <em className="not-italic text-z-gold relative">
          Idea
          <span className="absolute bottom-[-4px] left-0 right-0 h-[3px] rounded-sm bg-gradient-to-r from-z-gold to-transparent" />
        </em>{" "}
        to Exit.
        <br />
        Without the Chaos.
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-up-d2 relative text-lg text-z-muted max-w-[560px] leading-[1.7] mt-6 font-light">
        Zero2Exit is the AI-driven platform that replaces your consultants, lawyers, agencies, and
        spreadsheets — and guides you from day one to exit day.
      </p>

      {/* CTA buttons */}
      <div className="animate-fade-up-d3 relative flex gap-4 mt-12 flex-wrap justify-center">
        <Link
          href="/en/sign-up"
          className="bg-z-gold text-z-black px-9 py-4 rounded-lg font-body font-bold text-base tracking-[-0.2px] transition-all duration-250 hover:bg-z-gold-light hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(201,168,76,0.3)]"
        >
          Start Your Journey →
        </Link>
        <a
          href="#engine"
          className="bg-transparent text-z-text border border-z-border px-9 py-4 rounded-lg font-body font-medium text-base transition-all duration-250 hover:border-z-gold hover:text-z-gold"
        >
          See the AI Engine
        </a>
      </div>

      {/* Stats strip */}
      <div className="animate-fade-up-d4 relative flex gap-8 md:gap-15 mt-20 pt-12 border-t border-z-border flex-wrap justify-center">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-display text-4xl font-bold text-z-white">
              {stat.value}
              <span className="text-z-gold">{stat.accent}</span>
            </div>
            <div className="text-[13px] text-z-muted mt-1 tracking-[0.3px]">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
