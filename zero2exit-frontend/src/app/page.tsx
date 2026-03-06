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

export default function LandingPage() {
  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} landing-noise bg-z-black text-z-text font-body overflow-x-hidden`}
      style={{ scrollBehavior: "smooth" }}
    >
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
