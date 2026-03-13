"use client"

import type { ReactNode } from "react"
import { motion, type MotionProps, type Variants } from "framer-motion"

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

interface MotionWrapperProps extends MotionProps {
  children: ReactNode
  className?: string
}

export function FadeUp({ children, className, ...props }: MotionWrapperProps) {
  return (
    <motion.div
      className={className}
      variants={fadeUpVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerContainer({ children, className, ...props }: MotionWrapperProps) {
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className, ...props }: MotionWrapperProps) {
  return (
    <motion.div className={className} variants={fadeUpVariants} {...props}>
      {children}
    </motion.div>
  )
}

