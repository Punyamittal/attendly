import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Plus, ScanLine, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
} from '@/services/attendance'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Skeleton'
import { eventFormSchema, type EventFormInput } from '@/utils/validators'
import { formatDate, todayISO } from '@/utils/helpers'
import type { EventRecord } from '@/types'

export function EventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormInput>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      event_date: todayISO(),
      start_time: '',
      end_time: '',
      location: '',
      is_active: true,
    },
  })

  async function load() {
    const rows = await fetchEvents()
    setEvents(rows)
  }

  useEffect(() => {
    void (async () => {
      try {
        await load()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load events')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function openCreate() {
    reset({
      title: '',
      description: '',
      event_date: todayISO(),
      start_time: '',
      end_time: '',
      location: '',
      is_active: true,
    })
    setModalOpen(true)
  }

  async function onSubmit(values: EventFormInput) {
    try {
      await createEvent({
        title: values.title.trim(),
        description: values.description?.trim() || '',
        event_date: values.event_date,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        location: values.location?.trim() || '',
        is_active: values.is_active ?? true,
      })
      toast.success('Event created')
      setModalOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create event')
    }
  }

  async function toggleActive(event: EventRecord) {
    try {
      await updateEvent(event.id, { is_active: !event.is_active })
      toast.success(event.is_active ? 'Event deactivated' : 'Event activated')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function onDelete(event: EventRecord) {
    if (!confirm(`Delete event "${event.title}"?`)) return
    try {
      await deleteEvent(event.id)
      toast.success('Event deleted')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl">Events</h2>
          <p className="font-mono text-xs text-[var(--muted)]">
            Create events and scan QR for event attendance
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {events.length === 0 && (
          <GlassCard className="sm:col-span-2 xl:col-span-3 py-12 text-center font-mono text-xs text-[var(--muted)]">
            No events yet — create one to start scanning
          </GlassCard>
        )}
        {events.map((event) => (
          <GlassCard key={event.id} className="flex flex-col !p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-base normal-case tracking-normal">{event.title}</p>
                <p className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase text-[var(--muted)]">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(event.event_date)}
                </p>
              </div>
              <span
                className={`brutal-tag shrink-0 ${event.is_active ? '' : '!bg-ink-300 dark:!bg-ink-700'}`}
              >
                {event.is_active ? 'Active' : 'Off'}
              </span>
            </div>
            {event.location && (
              <p className="mt-2 font-mono text-xs text-[var(--muted)]">{event.location}</p>
            )}
            {event.description && (
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{event.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/admin/events/${event.id}`}>
                <Button className="!px-3 !text-[10px]">
                  <ScanLine className="h-4 w-4" />
                  Open QR
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="!px-3 !text-[10px]"
                onClick={() => void toggleActive(event)}
              >
                {event.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="ghost"
                className="!px-2 text-[var(--accent-2)]"
                onClick={() => void onDelete(event)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
          <div className="card-panel max-h-[92dvh] w-full max-w-lg overflow-y-auto safe-pb">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">Add Event</h3>
              <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
              <div className="sm:col-span-2">
                <Input label="Title" {...register('title')} error={errors.title?.message} />
              </div>
              <Input
                label="Date"
                type="date"
                {...register('event_date')}
                error={errors.event_date?.message}
              />
              <Input label="Location" {...register('location')} error={errors.location?.message} />
              <Input label="Start time" type="time" {...register('start_time')} />
              <Input label="End time" type="time" {...register('end_time')} />
              <div className="sm:col-span-2">
                <label className="label" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  className="input-field resize-none"
                  {...register('description')}
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 font-mono text-xs uppercase">
                <input type="checkbox" {...register('is_active')} className="h-4 w-4" />
                Active (open for scanning)
              </label>
              <div className="mt-2 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Create Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
