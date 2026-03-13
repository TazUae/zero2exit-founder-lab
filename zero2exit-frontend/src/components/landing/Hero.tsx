import Link from "next/link"

const stats = [
  { value: "500+", label: "clinics" },
  { value: "2M+", label: "patient messages" },
  { value: "40%", label: "fewer no-shows" },
  { value: "<2 min", label: "response time" },
]

export function Hero() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-28 relative overflow-hidden">
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

      <div className="w-full max-w-7xl mx-auto">
        {/* Badge */}
        <div className="animate-fade-up relative inline-flex items-center gap-2 border border-z-gold bg-z-gold-dim text-z-gold-light text-xs font-semibold tracking-[1.2px] uppercase px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-z-gold animate-pulse-dot" />
          AI-Powered Founder Operating System
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up-d1 relative font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight text-z-white max-w-[900px] mx-auto">
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
        <p className="animate-fade-up-d2 relative text-base md:text-lg text-slate-300 max-w-[560px] leading-relaxed mt-6 font-light mx-auto">
          Zero2Exit is the AI-driven platform that replaces your consultants, lawyers, agencies, and
          spreadsheets — and guides you from day one to exit day.
        </p>

        {/* Hero product visual */}
        <div className="relative mt-12 w-full max-w-4xl mx-auto animate-fade-up-d3">
          {/* Outer glow */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          </div>

          {/* Glass container with ambient shadow */}
          <div className="relative rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_40px_120px_rgba(59,130,246,0.25)] hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-z-red/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-z-gold/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-z-green/80" />
              </div>
              <span className="ml-3 text-xs font-code text-slate-300/80">Founder Command Center — Live</span>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="space-y-3 text-left">
                <div className="text-[11px] uppercase tracking-[2px] text-slate-400">Stage</div>
                <div className="text-sm font-semibold text-white">Pre-Seed · Idea Validated</div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-400 to-sky-300" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Routing Engine unlocks <span className="text-sky-300 font-semibold">M02 · Legal</span> next.
                </p>
              </div>
              <div className="space-y-3 text-left">
                <div className="text-[11px] uppercase tracking-[2px] text-slate-400">Today&apos;s Focus</div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <div className="text-xs font-semibold text-white">Complete Validation Scorecard</div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300" />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">4 of 8 dimensions confirmed</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 text-xs">
                    ⚡
                  </span>
                  AI Coach has 3 new recommendations.
                </div>
              </div>
              <div className="space-y-3 text-left">
                <div className="text-[11px] uppercase tracking-[2px] text-slate-400">Pipeline</div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-1.5">
                    <span>Investor Readiness</span>
                    <span className="font-code text-sky-300">68%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-1.5">
                    <span>Legal Structure</span>
                    <span className="font-code text-emerald-300">91%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-white/5 px-3 py-1.5">
                    <span>GTM &amp; Brand</span>
                    <span className="font-code text-slate-400">42%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
        <div className="animate-fade-up-d4 relative w-full max-w-4xl mx-auto mt-20 pt-12 border-t border-z-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold text-blue-400">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400 mt-1 tracking-[0.3px]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
