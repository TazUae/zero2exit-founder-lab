import Link from "next/link"
import { RevealOnScroll } from "./RevealOnScroll"

export function CTA() {
  return (
    <section className="text-center py-20 md:py-[120px] px-6 md:px-15 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,rgba(201,168,76,0.08)_0%,transparent_70%)]" />
      <RevealOnScroll className="relative">
        <h2 className="font-display text-[clamp(36px,5vw,64px)] font-black text-z-white max-w-[800px] mx-auto mb-6 leading-[1.1] tracking-[-1.5px]">
          Your Exit Starts<br />Today.
        </h2>
        <p className="text-lg text-z-muted max-w-[480px] mx-auto mb-10 leading-[1.7]">
          Answer 14 questions. Get your personalised founder roadmap in under 5 minutes. No credit card required.
        </p>
        <div className="flex justify-center">
          <Link
            href="/en/sign-up"
            className="bg-z-gold text-z-black text-lg font-bold px-12 py-[18px] rounded-lg font-body transition-all duration-250 hover:bg-z-gold-light hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(201,168,76,0.3)]"
          >
            Take the Founder Assessment →
          </Link>
        </div>
        <div className="mt-8 text-[13px] text-z-muted">
          Trusted by founders across MENA · Available in Arabic &amp; English
        </div>
      </RevealOnScroll>
    </section>
  )
}
