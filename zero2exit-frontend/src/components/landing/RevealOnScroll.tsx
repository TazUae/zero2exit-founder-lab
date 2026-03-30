"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

export function RevealOnScroll({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
