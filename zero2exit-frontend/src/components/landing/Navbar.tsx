"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

const navLinks = [
  { label: "Platform", href: "#journey" },
  { label: "Modules", href: "#modules" },
  { label: "AI Engine", href: "#engine" },
  { label: "Pricing", href: "#pricing" },
]

export function Navbar() {
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const [scrolled, setScrolled] = useState(false)
  const isSignedIn = false

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-5 md:px-15 transition-all duration-400 ${
        scrolled
          ? "bg-[rgba(7,7,8,0.92)] border-b border-z-border backdrop-blur-[20px]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <Link href="/" className="font-display font-bold text-[22px] tracking-[-0.5px] text-z-white">
        Zero<span className="text-z-gold">2</span>Exit
      </Link>

      <ul className="hidden md:flex gap-9 list-none">
        {navLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="text-z-muted text-sm font-medium tracking-[0.3px] hover:text-z-white transition-colors duration-200"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        {isSignedIn ? (
          <Link
            href={`/${locale}/dashboard`}
            className="bg-z-gold text-z-black px-6 py-2.5 rounded-md font-body font-semibold text-sm cursor-pointer transition-all duration-200 hover:bg-z-gold-light hover:-translate-y-0.5"
          >
            Command Center →
          </Link>
        ) : (
          <>
            <Link
              href={`/${locale}/sign-in`}
              className="text-z-muted text-sm font-medium hover:text-z-white transition-colors duration-200 hidden sm:block"
            >
              Login
            </Link>
            <Link
              href={`/${locale}/sign-up`}
              className="bg-z-gold text-z-black px-6 py-2.5 rounded-md font-body font-semibold text-sm cursor-pointer transition-all duration-200 hover:bg-z-gold-light hover:-translate-y-0.5"
            >
              Start Free →
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
