import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import {
  bulkImportStudents,
  createStudent,
  deleteStudent,
  fetchStudents,
  updateStudent,
} from '@/services/attendance'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageLoader } from '@/components/ui/Skeleton'
import { studentFormSchema, type StudentFormInput } from '@/utils/validators'
import { downloadBlob, studentToCsvRow, toCsv } from '@/utils/helpers'
import type { Student } from '@/types'

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [importing, setImporting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormInput>({ resolver: zodResolver(studentFormSchema) })

  async function load() {
    const rows = await fetchStudents({
      search: search || undefined,
      department: department || undefined,
    })
    setStudents(rows)
  }

  useEffect(() => {
    void (async () => {
      try {
        await load()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load students')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load().catch(() => undefined)
    }, 300)
    return () => window.clearTimeout(t)
  }, [search, department])

  const departments = useMemo(
    () => Array.from(new Set(students.map((s) => s.department).filter(Boolean))).sort(),
    [students]
  )

  function openCreate() {
    setEditing(null)
    reset({
      registration_number: '',
      name: '',
      programme: '',
      department: '',
      batch: '',
      email: '',
    })
    setModalOpen(true)
  }

  function openEdit(s: Student) {
    setEditing(s)
    reset({
      registration_number: s.registration_number,
      name: s.name,
      programme: s.programme,
      department: s.department,
      batch: s.batch,
      email: s.email ?? '',
    })
    setModalOpen(true)
  }

  async function onSubmit(values: StudentFormInput) {
    try {
      const payload = {
        registration_number: values.registration_number.trim(),
        name: values.name.trim(),
        programme: values.programme.trim(),
        department: values.department.trim(),
        batch: values.batch.trim(),
        email: values.email?.trim() || null,
      }
      if (editing) {
        await updateStudent(editing.id, payload)
        toast.success('Student updated')
      } else {
        await createStudent(payload)
        toast.success('Student added')
      }
      setModalOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function onDelete(s: Student) {
    if (!confirm(`Delete ${s.name}?`)) return
    try {
      await deleteStudent(s.id)
      toast.success('Student deleted')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  function exportCsv() {
    const csv = toCsv(students.map(studentToCsvRow))
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'students.csv')
    toast.success('Exported students.csv')
  }

  function onImportFile(file: File) {
    setImporting(true)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data
            .map((r) => ({
              registration_number: (
                r['Registration Number'] ||
                r.registration_number ||
                ''
              ).trim(),
              name: (r.Name || r.name || '').trim(),
              programme: (r.Programme || r.programme || '').trim(),
              department: (r.Department || r.department || '').trim(),
              batch: (r.Batch || r.batch || '').trim(),
              email: (r.Email || r.email || '').trim() || null,
            }))
            .filter((r) => r.registration_number && r.name)

          const summary = await bulkImportStudents(rows)
          toast.success(
            `Imported ${summary.imported}, skipped ${summary.skipped}${
              summary.errors.length ? `, errors ${summary.errors.length}` : ''
            }`
          )
          if (summary.errors[0]) toast.error(summary.errors[0])
          await load()
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Import failed')
        } finally {
          setImporting(false)
        }
      },
      error: () => {
        setImporting(false)
        toast.error('Could not parse CSV')
      },
    })
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl">Students</h2>
          <p className="font-mono text-xs text-[var(--muted)] sm:text-sm">
            {students.length} records
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <label className="btn-secondary col-span-2 cursor-pointer sm:col-span-1">
            <Upload className="h-4 w-4" />
            {importing ? 'Importing…' : 'Import CSV'}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImportFile(f)
                e.target.value = ''
              }}
            />
          </label>
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      <GlassCard className="!p-3 sm:!p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="input-field pl-10"
              placeholder="Search reg no, name, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-field sm:w-48"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {students.length === 0 && (
          <GlassCard className="py-10 text-center font-mono text-xs text-[var(--muted)]">
            No students found
          </GlassCard>
        )}
        {students.map((s) => (
          <GlassCard key={s.id} className="!p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-sm normal-case tracking-normal">{s.name}</p>
                <p className="font-mono text-xs text-[var(--muted)]">{s.registration_number}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" className="btn-ghost" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-ghost text-[var(--accent-2)]"
                  onClick={() => void onDelete(s)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase text-[var(--muted)]">
              <span className="break-words">{s.programme || '—'}</span>
              <span className="break-words">{s.department || '—'}</span>
              <span className="break-words">{s.batch || '—'}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Desktop table */}
      <GlassCard className="hidden !p-0 md:block">
        <div className="table-scroll">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--glass-border)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Reg No</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Programme</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-[var(--glass-border)] last:border-0">
                  <td className="px-4 py-3 font-medium">{s.registration_number}</td>
                  <td className="px-4 py-3">{s.name}</td>
                  <td className="px-4 py-3">{s.programme}</td>
                  <td className="px-4 py-3">{s.department}</td>
                  <td className="px-4 py-3">{s.batch}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button type="button" className="btn-ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-red-500"
                        onClick={() => void onDelete(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--muted)]">
                    No students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="card-panel max-h-[92dvh] w-full max-w-lg overflow-y-auto safe-pb sm:max-h-[90vh]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-base sm:text-lg">
                {editing ? 'Edit Student' : 'Add Student'}
              </h3>
              <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
              <Input
                label="Registration Number"
                {...register('registration_number')}
                error={errors.registration_number?.message}
              />
              <Input label="Name" {...register('name')} error={errors.name?.message} />
              <Input
                label="Programme"
                {...register('programme')}
                error={errors.programme?.message}
              />
              <Input
                label="Department"
                {...register('department')}
                error={errors.department?.message}
              />
              <Input label="Batch" {...register('batch')} error={errors.batch?.message} />
              <Input label="Email" {...register('email')} error={errors.email?.message} />
              <div className="mt-2 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
