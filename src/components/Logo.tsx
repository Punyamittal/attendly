import { Link } from 'react-router-dom'
import { QrCode } from 'lucide-react'
import { cn } from '@/utils/helpers'

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('inline-flex max-w-full items-center gap-2 sm:gap-2.5', className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center border-[3px] border-ink-950 bg-brand-400 text-ink-950 shadow-[3px_3px_0_#111110] dark:border-brand-400 dark:shadow-[3px_3px_0_#c6f500] sm:h-10 sm:w-10">
        <QrCode className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
      </span>
      <span className="font-display text-lg uppercase leading-none tracking-tight text-ink-950 dark:text-ink-50 sm:text-xl">
        Attend<span className="bg-brand-400 px-1 text-ink-950">ly</span>
      </span>
    </Link>
  )
}
