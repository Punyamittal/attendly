import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'
import type { ReactNode } from 'react'

const nav = [
  { label: 'Features', href: '/#features' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
]

export function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname, location.hash])

  return (
    <div className="page-bg min-h-screen">
      <header
        className={cn(
          'sticky top-0 z-50 transition-all',
          scrolled
            ? 'border-b-[3px] border-[var(--glass-border)] bg-[var(--glass)] shadow-[0_4px_0_var(--ring)]'
            : 'border-b-[3px] border-transparent'
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 safe-px py-3 sm:px-6 sm:py-4">
          <Logo className="min-w-0 shrink" />
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--muted)] transition hover:bg-brand-400 hover:px-2 hover:text-ink-950"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            <Link to="/student/login">
              <Button variant="ghost">Student</Button>
            </Link>
            <Link to="/admin/login">
              <Button>Admin Login</Button>
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t-[3px] border-[var(--glass-border)] bg-[var(--surface)] safe-px py-4 safe-pb md:hidden">
            <div className="flex flex-col gap-2">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="min-h-11 border-[3px] border-ink-950 bg-brand-400 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink-950"
                >
                  {item.label}
                </a>
              ))}
              <Link
                to="/student/login"
                className="min-h-11 border-[3px] border-ink-950 bg-[var(--surface)] px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest"
              >
                Student Login
              </Link>
              <Link to="/admin/login">
                <Button className="w-full">Admin Login</Button>
              </Link>
            </div>
          </div>
        )}
      </header>
      <main>{children}</main>
      <footer className="border-t-[3px] border-[var(--glass-border)] bg-ink-950 py-8 text-brand-400 safe-pb">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 safe-px text-center sm:flex-row sm:px-6 sm:text-left">
          <Logo />
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-300 sm:text-xs">
            © {new Date().getFullYear()} Attendly // Smart QR attendance
          </p>
        </div>
      </footer>
    </div>
  )
}
