export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Playfair_Display, DM_Sans, DM_Mono } from "next/font/google"
import { Navbar } from "@/components/landing/Navbar"
import { Hero } from "@/components/landing/Hero"
import { Journey } from "@/components/landing/Journey"
import { AIEngine } from "@/components/landing/AIEngine"
import { Modules } from "@/components/landing/Modules"
import { DesignSystem } from "@/components/landing/DesignSystem"
import { Pricing } from "@/components/landing/Pricing"
import { CTA } from "@/components/landing/CTA"
import { Footer } from "@/components/landing/Footer"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
})

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect(`/${locale}/dashboard`)
  }

  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} landing-noise bg-gradient-to-b from-[#0B1437] via-[#0B1437] to-[#070f2e] text-z-text font-body relative overflow-x-hidden`}
      style={{ scrollBehavior: "smooth" }}
    >
      {/* Global background lighting behind hero and sections */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 70% 30%, rgba(59,130,246,0.18), transparent 40%)",
          }}
        />
        <div
          className="absolute inset-0 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 20% 60%, rgba(37,99,235,0.12), transparent 45%)",
          }}
        />
      </div>
      <Navbar />
      <Hero />
      <Journey />
      <AIEngine />
      <Modules />
      <DesignSystem />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
