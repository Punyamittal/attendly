import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  deleteEventAttendance,
  fetchEventAttendance,
  fetchEvents,
  manualMarkEventAttendance,
} from '@/services/attendance'
import { EventQrDisplay } from '@/components/qr/EventQrDisplay'
import { QrScanner } from '@/components/qr/QrScanner'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Skeleton'
import { formatDate, formatTime } from '@/utils/helpers'
import type { EventAttendance, EventRecord } from '@/types'

const manualSchema = z.object({
  registration_number: z.string().min(3, 'Required'),
})

type ManualInput = z.infer<typeof manualSchema>
type PanelMode = 'display' | 'scan'

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [rows, setRows] = useState<EventAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [manualOpen, setManualOpen] = useState(false)
  const [mode, setMode] = useState<PanelMode>('display')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualInput>({ resolver: zodResolver(manualSchema) })

  async function load() {
    if (!eventId) return
    const [allEvents, attendance] = await Promise.all([
      fetchEvents(),
      fetchEventAttendance(eventId),
    ])
    setEvent(allEvents.find((e) => e.id === eventId) ?? null)
    setRows(attendance)
  }

  useEffect(() => {
    void (async () => {
      try {
        await load()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    })()

    const t = window.setInterval(() => {
      void load().catch(() => undefined)
    }, 8000)
    return () => window.clearInterval(t)
  }, [eventId])

  async function onManual(values: ManualInput) {
    if (!eventId) return
    try {
      await manualMarkEventAttendance({
        event_id: eventId,
        registration_number: values.registration_number,
      })
      toast.success('Event attendance added')
      reset()
      setManualOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add')
    }
  }

  async function onDelete(row: EventAttendance) {
    if (!confirm(`Remove ${row.student_name}?`)) return
    try {
      await deleteEventAttendance(row.id)
      toast.success('Removed')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) return <PageLoader />
  if (!event || !eventId) {
    return (
      <GlassCard>
        <p>Event not found</p>
        <Link to="/admin/events" className="mt-4 inline-block">
          <Button variant="secondary">Back to Events</Button>
        </Link>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/admin/events"
            className="mb-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-[var(--muted)]"
          >
            <ArrowLeft className="h-3 w-3" /> Events
          </Link>
          <h2 className="font-display text-xl sm:text-2xl">{event.title}</h2>
          <p className="font-mono text-xs text-[var(--muted)]">
            {formatDate(event.event_date)}
            {event.location ? ` · ${event.location}` : ''} · {rows.length} marked
          </p>
        </div>
        <Button onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4" />
          Manual Add
        </Button>
      </div>

      {!event.is_active && (
        <GlassCard className="!bg-[var(--accent-2)] !text-white">
          <p className="font-mono text-xs uppercase">This event is inactive — scanning may be rejected.</p>
        </GlassCard>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={mode === 'display' ? 'primary' : 'secondary'}
          onClick={() => setMode('display')}
          type="button"
        >
          Show Event QR
        </Button>
        <Button
          variant={mode === 'scan' ? 'primary' : 'secondary'}
          onClick={() => setMode('scan')}
          type="button"
        >
          Scan Student QR
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          {mode === 'display' ? (
            <>
              <h3 className="mb-3 font-display text-lg">Display QR for students</h3>
              <EventQrDisplay eventId={eventId} eventTitle={event.title} />
            </>
          ) : (
            <>
              <h3 className="mb-3 font-display text-lg">Scan student QR</h3>
              <QrScanner eventId={eventId} regionId={`event-scanner-${eventId}`} />
            </>
          )}
        </div>

        <div>
          <h3 className="mb-3 font-display text-lg">Marked ({rows.length})</h3>
          <div className="space-y-2">
            {rows.length === 0 && (
              <GlassCard className="py-8 text-center font-mono text-xs text-[var(--muted)]">
                No scans yet
              </GlassCard>
            )}
            {rows.map((r) => (
              <GlassCard key={r.id} className="!p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.student_name}</p>
                    <p className="font-mono text-xs text-[var(--muted)]">{r.registration_number}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase text-[var(--muted)]">
                      {formatTime(
                        r.marked_at.includes('T')
                          ? r.marked_at.split('T')[1]?.slice(0, 8) || ''
                          : r.marked_at
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="brutal-tag">{r.status}</span>
                    <button
                      type="button"
                      className="btn-ghost text-[var(--accent-2)]"
                      onClick={() => void onDelete(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </div>

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="card-panel w-full max-w-md safe-pb">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">Manual Add</h3>
              <button type="button" className="btn-ghost" onClick={() => setManualOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit(onManual)}>
              <Input
                label="Registration Number"
                placeholder="e.g. 23BAI1559"
                {...register('registration_number')}
                error={errors.registration_number?.message}
              />
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setManualOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Mark Present
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
