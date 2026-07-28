import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, FlipHorizontal2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { markAttendanceFromQr } from '@/services/attendance'
import { playSuccessBeep } from '@/utils/helpers'
import { Button } from '@/components/ui/Button'
import type { MarkAttendanceResult, QrPayload } from '@/types'

const REGION_ID = 'attendly-qr-reader'

interface OfflineItem {
  token: string
  scannedAt: string
}

const OFFLINE_KEY = 'attendly-offline-queue'

function loadQueue(): OfflineItem[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]') as OfflineItem[]
  } catch {
    return []
  }
}

function saveQueue(items: OfflineItem[]) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(items))
}

export function QrScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const processingRef = useRef(false)
  const lastTokenRef = useRef<string>('')
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [cameraIndex, setCameraIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [lastResult, setLastResult] = useState<MarkAttendanceResult | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [queueCount, setQueueCount] = useState(loadQueue().length)

  async function processToken(token: string) {
    if (processingRef.current) return
    if (token === lastTokenRef.current) return
    processingRef.current = true
    lastTokenRef.current = token

    try {
      if (!navigator.onLine) {
        const q = loadQueue()
        if (!q.some((i) => i.token === token)) {
          q.push({ token, scannedAt: new Date().toISOString() })
          saveQueue(q)
          setQueueCount(q.length)
          toast('Offline — scan queued for sync', { icon: '📡' })
        }
        return
      }

      const result = await markAttendanceFromQr(token)
      setLastResult(result)

      if (result.success) {
        playSuccessBeep()
        setShowSuccess(true)
        toast.success(result.message)
        setTimeout(() => setShowSuccess(false), 1800)
      } else if (result.code === 'ALREADY_MARKED') {
        toast.error(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setTimeout(() => {
        processingRef.current = false
        lastTokenRef.current = ''
      }, 2500)
    }
  }

  async function syncQueue() {
    const q = loadQueue()
    if (!q.length || !navigator.onLine) return
    const remaining: OfflineItem[] = []
    for (const item of q) {
      try {
        await markAttendanceFromQr(item.token)
      } catch {
        remaining.push(item)
      }
    }
    saveQueue(remaining)
    setQueueCount(remaining.length)
    if (q.length !== remaining.length) {
      toast.success(`Synced ${q.length - remaining.length} offline scan(s)`)
    }
  }

  useEffect(() => {
    const onOnline = () => void syncQueue()
    window.addEventListener('online', onOnline)
    void syncQueue()
    return () => window.removeEventListener('online', onOnline)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const devices = await Html5Qrcode.getCameras()
        if (!devices.length) {
          toast.error('No camera found')
          return
        }
        if (cancelled) return
        setCameras(devices.map((d) => ({ id: d.id, label: d.label })))

        const scanner = new Html5Qrcode(REGION_ID)
        scannerRef.current = scanner

        const camId = devices[cameraIndex % devices.length]?.id
        const box = Math.min(240, Math.floor(window.innerWidth * 0.65))
        await scanner.start(
          camId,
          {
            fps: 10,
            qrbox: { width: box, height: box },
            aspectRatio: 1,
            disableFlip: false,
          },
          async (decoded) => {
            try {
              const parsed = JSON.parse(decoded) as QrPayload
              if (parsed?.token) await processToken(parsed.token)
              else toast.error('Invalid QR payload')
            } catch {
              if (decoded.length > 16) await processToken(decoded)
              else toast.error('Unrecognized QR format')
            }
          },
          () => undefined
        )
        if (!cancelled) setReady(true)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Camera access failed')
      }
    }

    void start()

    return () => {
      cancelled = true
      const scanner = scannerRef.current
      scannerRef.current = null
      if (scanner?.isScanning) {
        void scanner.stop().then(() => scanner.clear()).catch(() => undefined)
      }
    }
  }, [cameraIndex])

  function switchCamera() {
    if (cameras.length < 2) {
      toast('Only one camera available')
      return
    }
    setReady(false)
    setCameraIndex((i) => (i + 1) % cameras.length)
  }

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="card-panel overflow-hidden !p-2 sm:!p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0 font-mono text-[10px] font-bold uppercase tracking-wide sm:text-xs">
            <span className="inline-flex items-center gap-2">
              <Camera className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="truncate">
                {ready ? 'Hold QR in frame' : 'Starting camera…'}
              </span>
            </span>
          </div>
          <Button variant="secondary" onClick={switchCamera} type="button" className="!px-2 sm:!px-4">
            <FlipHorizontal2 className="h-4 w-4" />
            <span className="hidden sm:inline">Switch</span>
          </Button>
        </div>

        <div
          id={REGION_ID}
          className="min-h-[260px] overflow-hidden border-[3px] border-ink-950 bg-ink-900 dark:border-ink-50 sm:min-h-[320px] [&_video]:!h-auto [&_video]:!w-full [&_video]:object-cover"
        />

        {queueCount > 0 && (
          <p className="mt-3 text-center font-mono text-xs uppercase text-amber-600">
            {queueCount} offline scan(s) pending sync
          </p>
        )}
      </div>

      {lastResult && (
        <div
          className={`mt-4 border-[3px] border-ink-950 p-4 text-center shadow-[4px_4px_0_#111110] dark:border-ink-50 ${
            lastResult.success ? 'bg-brand-400 text-ink-950' : 'bg-[var(--accent-2)] text-white'
          }`}
        >
          <p className="font-display text-sm">{lastResult.message}</p>
          {lastResult.student && (
            <p className="mt-1 font-mono text-xs opacity-80">
              {lastResult.student.name} · {lastResult.student.registration_number}
            </p>
          )}
        </div>
      )}

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="border-[3px] border-ink-950 bg-brand-400 p-6 text-ink-950 shadow-[8px_8px_0_#111110]">
              <CheckCircle2 className="h-16 w-16" strokeWidth={2.5} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
