'use client'

import { format } from 'date-fns'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { getISOWeekFriday } from '@/lib/utils/date-helpers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 2, currentYear - 1, currentYear].map(y => ({
  value: String(y),
  label: String(y),
}))

function getISOWeekCount(year: number): number {
  const dec31 = new Date(year, 11, 31)
  const jan1 = new Date(year, 0, 1)
  return dec31.getDay() === 4 || jan1.getDay() === 4 ? 53 : 52
}

function getCurrentISOWeek(): number {
  const d = new Date()
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function PerformancePeriodSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Read all values directly from URL so the UI always reflects current state
  const period = searchParams.get('period') ?? 'weekly'
  const year = parseInt(searchParams.get('year') ?? String(currentYear))
  const quarter = parseInt(searchParams.get('quarter') ?? '1')
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const week = parseInt(searchParams.get('week') ?? String(getCurrentISOWeek()))

  const weekCount = getISOWeekCount(year)
  const WEEKS = Array.from({ length: weekCount }, (_, i) => ({
    value: String(i + 1),
    label: format(getISOWeekFriday(i + 1, year), 'd MMM'),
  }))

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period type pills */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {(['weekly', 'monthly', 'quarterly', 'annual'] as const).map(p => (
          <button
            key={p}
            onClick={() => updateParam('period', p)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              period === p
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-500 hover:text-slate-900'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Year */}
      <Select value={String(year)} onValueChange={val => updateParam('year', val)}>
        <SelectTrigger className="h-10 w-28 text-sm border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map(y => (
            <SelectItem key={y.value} value={y.value} className="text-sm">{y.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {period === 'quarterly' && (
        <Select value={String(quarter)} onValueChange={val => updateParam('quarter', val)}>
          <SelectTrigger className="h-10 w-28 text-sm border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map(q => (
              <SelectItem key={q} value={String(q)} className="text-sm">Q{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {period === 'monthly' && (
        <Select value={String(month)} onValueChange={val => updateParam('month', val)}>
          <SelectTrigger className="h-10 w-36 text-sm border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {period === 'weekly' && (
        <Select value={String(week)} onValueChange={val => updateParam('week', val)}>
          <SelectTrigger className="h-10 w-32 text-sm border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEKS.map(w => (
              <SelectItem key={w.value} value={w.value} className="text-sm">{w.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
