export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: 'easeOut' },
}

export const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
}
