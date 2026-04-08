'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ZONAL_OFFICE_LABELS } from '@/types/activity.types'

interface ReportsPeriodSelectorProps {
  period: string
  year: number
  quarter: number
  month: number
  week: number
  zone?: string
  isAdmin: boolean
}

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
]

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 2, currentYear - 1, currentYear].map(y => ({ value: String(y), label: String(y) }))

function getISOWeekCount(year: number): number {
  // A year has 53 ISO weeks if Dec 31 or Jan 1 falls on Thursday
  const dec31 = new Date(year, 11, 31)
  const jan1 = new Date(year, 0, 1)
  return (dec31.getDay() === 4 || jan1.getDay() === 4) ? 53 : 52
}

export function ReportsPeriodSelector({
  period, year, quarter, month, week, zone, isAdmin,
}: ReportsPeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()

  const weekCount = getISOWeekCount(year)
  const WEEKS = Array.from({ length: weekCount }, (_, i) => ({
    value: String(i + 1),
    label: `Week ${i + 1}`,
  }))

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams()
    params.set('period', period)
    params.set('year', String(year))
    params.set('quarter', String(quarter))
    params.set('month', String(month))
    params.set('week', String(week))
    if (zone) params.set('zone', zone)
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Period Type */}
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

      {/* Quarter or Month */}
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

      {/* Zone filter for admins */}
      {isAdmin && (
        <Select value={zone ?? 'all'} onValueChange={val => updateParam('zone', val)}>
          <SelectTrigger className="h-10 w-40 text-sm border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">All Zones</SelectItem>
            {Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-sm">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
