import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/helpers'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  loading?: boolean
  children: ReactNode
}

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

export function Button({
  variant = 'primary',
  loading,
  children,
  className,
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={cn(variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
