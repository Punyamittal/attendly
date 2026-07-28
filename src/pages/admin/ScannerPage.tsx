import { QrScanner } from '@/components/qr/QrScanner'
import { GlassCard } from '@/components/ui/GlassCard'

export function ScannerPage() {
  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="font-display text-2xl font-bold">Attendance Scanner</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Webcam opens automatically. Point at a student QR — attendance marks itself.
        </p>
      </div>

      <QrScanner />

      <GlassCard className="mx-auto max-w-xl text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--fg)]">Scan rules</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>QR must be unexpired (valid for 60 seconds)</li>
          <li>Student must exist in the database</li>
          <li>Only one attendance per student per day</li>
          <li>Offline scans are queued and synced when back online</li>
        </ul>
      </GlassCard>
    </div>
  )
}
