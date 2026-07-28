import { motion } from 'framer-motion'
import { cn } from '@/utils/helpers'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className, hover = false }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8, y: 8 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={
        hover
          ? { x: 2, y: 2, boxShadow: '3px 3px 0 var(--fg)', transition: { duration: 0.12 } }
          : undefined
      }
      className={cn('card-panel', className)}
    >
      {children}
    </motion.div>
  )
}
