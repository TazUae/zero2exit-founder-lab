import Link from "next/link"

const links = [
  { label: "Platform", href: "#journey" },
  { label: "Modules", href: "#modules" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#" },
  { label: "Privacy", href: "#" },
]

export function Footer() {
  return (
    <footer className="border-t border-z-border py-12 px-6 md:px-15 flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1300px] mx-auto text-center md:text-left">
      <Link href="/" className="font-display text-xl font-semibold tracking-tight text-z-white">
        Zero<span className="text-z-gold">2</span>Exit
      </Link>

      <div className="flex gap-8 flex-wrap justify-center">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-[13px] text-z-muted hover:text-z-text transition-colors duration-200"
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="text-xs text-z-muted">© 2025 Zero2Exit · All rights reserved</div>
    </footer>
  )
}
