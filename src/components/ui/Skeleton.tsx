import { cn } from '@/utils/helpers'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin border-[3px] border-ink-950 border-t-brand-400 dark:border-ink-50 dark:border-t-brand-400" />
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
          Loading…
        </p>
      </div>
    </div>
  )
}
