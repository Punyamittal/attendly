import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { isSupabaseConfigured } from '@/lib/supabase'

export function SettingsPage() {
  const { adminUser, logoutAdmin } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-sm text-[var(--muted)]">Account and appearance preferences</p>
      </div>

      <GlassCard className="space-y-4">
        <h3 className="font-display text-lg font-semibold">Admin account</h3>
        <div className="text-sm">
          <p className="text-[var(--muted)]">Email</p>
          <p className="font-medium">{adminUser?.email}</p>
        </div>
        <div className="text-sm">
          <p className="text-[var(--muted)]">User ID</p>
          <p className="break-all font-mono text-xs">{adminUser?.id}</p>
        </div>
        <div className="text-sm">
          <p className="text-[var(--muted)]">Supabase</p>
          <p className={isSupabaseConfigured ? 'text-brand-600' : 'text-amber-500'}>
            {isSupabaseConfigured ? 'Connected' : 'Not configured — update .env'}
          </p>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4">
        <h3 className="font-display text-lg font-semibold">Appearance</h3>
        <div className="flex gap-2">
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => setTheme('light')}>
            Light
          </Button>
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => setTheme('dark')}>
            Dark
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-display text-lg font-semibold">Session</h3>
        <Button variant="danger" className="mt-4" onClick={() => void logoutAdmin()}>
          Sign out
        </Button>
      </GlassCard>
    </div>
  )
}
