import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Maximize2, RefreshCw, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { createEventQrSession } from '@/services/attendance'
import { Button } from '@/components/ui/Button'
import { GlassCard } from '@/components/ui/GlassCard'
import type { EventQrPayload } from '@/types'

const TTL = 60

interface Props {
  eventId: string
  eventTitle?: string
}

/** Admin display QR for an event — regenerates every 60 seconds */
export function EventQrDisplay({ eventId, eventTitle }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('')
  const [secondsLeft, setSecondsLeft] = useState(TTL)
  const [fullscreen, setFullscreen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)
  const expiresAtRef = useRef<number>(0)
  const refreshingRef = useRef(false)

  const generate = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    setLoading(true)
    try {
      const session = await createEventQrSession(eventId)
      const payload: EventQrPayload = {
        type: 'event',
        token: session.token,
        eventId: session.event_id,
        timestamp: session.timestamp,
      }
      const url = await QRCode.toDataURL(JSON.stringify(payload), {
        width: 360,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      })
      setDataUrl(url)
      expiresAtRef.current = new Date(session.expires_at).getTime()
      setSecondsLeft(TTL)
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Failed to generate event QR'
      toast.error(message)
      expiresAtRef.current = Date.now() + 10_000
      setSecondsLeft(10)
    } finally {
      setLoading(false)
      refreshingRef.current = false
    }
  }, [eventId])

  useEffect(() => {
    void generate()
  }, [generate])

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((expiresAtRef.current - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left <= 0 && !refreshingRef.current) void generate()
    }, 250)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [generate])

  function downloadPng() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `event-qr-${eventId.slice(0, 8)}.png`
    a.click()
    toast.success('QR downloaded')
  }

  return (
    <>
      <GlassCard className="flex w-full flex-col items-center overflow-hidden text-center">
        <h2 className="font-display text-lg sm:text-xl">Event Check-in QR</h2>
        <p className="mt-1 max-w-sm font-mono text-[10px] text-[var(--muted)] sm:text-xs">
          Students scan this with their phone after login. Regenerates every 60s.
        </p>
        {eventTitle && (
          <p className="mt-2 font-mono text-xs font-bold uppercase tracking-wide">{eventTitle}</p>
        )}

        <div className="relative mt-5 border-[3px] border-ink-950 bg-white p-3 shadow-[4px_4px_0_#111110] dark:border-ink-50 sm:mt-6 sm:p-4">
          {dataUrl ? (
            <img src={dataUrl} alt="Event QR" className="h-48 w-48 sm:h-64 sm:w-64" />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center sm:h-64 sm:w-64">
              <div className="h-8 w-8 animate-spin border-[3px] border-ink-950 border-t-brand-400" />
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
            QR expires in
          </p>
          <motion.div
            key={secondsLeft}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`font-display text-5xl tabular-nums ${
              secondsLeft <= 10 ? 'text-[var(--accent-2)]' : 'text-ink-950 dark:text-brand-400'
            }`}
          >
            {String(secondsLeft).padStart(2, '0')}
          </motion.div>
          <div className="mt-1 h-3 w-40 overflow-hidden border-[3px] border-ink-950 bg-ink-100 dark:border-ink-50 dark:bg-ink-800 sm:w-48">
            <div
              className="h-full bg-brand-400 transition-all duration-300"
              style={{ width: `${(secondsLeft / TTL) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-center">
          <Button variant="secondary" onClick={() => void generate()} loading={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh QR
          </Button>
          <Button variant="secondary" onClick={downloadPng} disabled={!dataUrl}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button variant="secondary" onClick={() => setFullscreen(true)} disabled={!dataUrl}>
            <Maximize2 className="h-4 w-4" />
            Full Screen
          </Button>
        </div>
      </GlassCard>

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950/95 p-4 safe-pb sm:p-6"
          >
            <button
              type="button"
              className="absolute right-3 top-3 border-[3px] border-white bg-[var(--accent-2)] p-2 text-white sm:right-4 sm:top-4"
              onClick={() => setFullscreen(false)}
            >
              <X className="h-6 w-6" strokeWidth={2.5} />
            </button>
            {eventTitle && (
              <p className="mb-4 max-w-lg text-center font-display text-2xl text-brand-400 sm:text-3xl">
                {eventTitle}
              </p>
            )}
            <img
              src={dataUrl}
              alt="Event QR Fullscreen"
              className="max-h-[55vh] w-[min(100%,20rem)] border-[3px] border-white bg-white p-4 shadow-[6px_6px_0_#c6f500] sm:max-h-[70vh] sm:w-auto sm:p-6"
            />
            <p className="mt-6 font-display text-5xl tabular-nums text-brand-400">
              {String(secondsLeft).padStart(2, '0')}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-ink-300">
              seconds remaining
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
