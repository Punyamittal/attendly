import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarDays,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/Logo'
import { cn } from '@/utils/helpers'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { logoutAdmin, adminUser } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logoutAdmin()
    navigate('/admin/login')
  }

  return (
    <div className="page-bg min-h-screen md:flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[min(18rem,88vw)] border-r-[3px] border-[var(--glass-border)] bg-[var(--glass)] transition-transform md:static md:w-72 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col p-3 safe-pb sm:p-4">
          <div className="mb-6 flex items-center justify-between gap-2 px-1 pt-2 sm:mb-8">
            <Logo to="/admin" />
            <button type="button" className="btn-ghost md:hidden" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 border-[3px] px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-wide transition',
                    isActive
                      ? 'border-ink-950 bg-brand-400 text-ink-950 shadow-[3px_3px_0_#111110] dark:border-brand-400 dark:shadow-[3px_3px_0_#c6f500]'
                      : 'border-transparent text-[var(--muted)] hover:border-ink-950 hover:bg-[var(--surface)] dark:hover:border-ink-50'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 border-t-[3px] border-[var(--glass-border)] pt-4">
            <p className="truncate px-3 font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">
              {adminUser?.email}
            </p>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-2 flex min-h-11 w-full items-center gap-3 border-[3px] border-transparent px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-wide text-[var(--accent-2)] hover:border-[var(--accent-2)] hover:bg-[var(--accent-2)] hover:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.5} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink-950/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b-[3px] border-[var(--glass-border)] bg-[var(--glass)] px-3 py-3 sm:px-6">
          <button type="button" className="btn-ghost shrink-0 md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 truncate font-display text-base sm:text-lg md:text-xl">
            Admin Console
          </h1>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link to="/admin/events" className="btn-primary !px-2 !text-[10px] sm:!px-4 sm:!text-sm">
              <CalendarDays className="h-4 w-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">Events</span>
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 safe-pb sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function StudentLayout({ children }: { children?: ReactNode }) {
  const { student, logoutStudent } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logoutStudent()
    navigate('/student/login')
  }

  return (
    <div className="page-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b-[3px] border-[var(--glass-border)] bg-[var(--glass)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 safe-px py-3 sm:px-6">
          <Logo to="/student" className="min-w-0" />
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <div className="hidden max-w-[10rem] border-[3px] border-ink-950 bg-brand-400 px-2 py-1 text-right dark:border-brand-400 sm:block sm:max-w-none sm:px-3">
              <p className="truncate font-display text-[10px] leading-none text-ink-950 sm:text-xs">
                {student?.name}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] uppercase text-ink-800">
                {student?.registration_number}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn-ghost text-[var(--accent-2)]"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl overflow-x-hidden p-3 safe-pb sm:p-6">
        {children ?? <Outlet />}
      </main>
    </div>
  )
}
