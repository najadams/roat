'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import { upsertTargets, getTargetsForPeriod } from '@/actions/target.actions'
import { cn } from '@/lib/utils/cn'

interface TargetsFormProps {
  initialZone: string
  initialYear: number
  initialQuarter: number
  initialTargets: Record<string, number>
}

const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
const activityTypes = Object.keys(ACTIVITY_TYPE_LABELS)

export function TargetsForm({
  initialZone,
  initialYear,
  initialQuarter,
  initialTargets,
}: TargetsFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [zone, setZone] = useState(initialZone)
  const [year, setYear] = useState(initialYear)
  const [quarter, setQuarter] = useState(initialQuarter)
  const [targets, setTargets] = useState<Record<string, string>>(
    Object.fromEntries(activityTypes.map(t => [t, initialTargets[t] ? String(initialTargets[t]) : '']))
  )
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  function updateSearchParams(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    params.set('zone', zone)
    params.set('year', String(year))
    params.set('quarter', String(quarter))
    for (const [k, v] of Object.entries(overrides)) params.set(k, v)
    router.push(`${pathname}?${params.toString()}`)
  }

  async function loadTargets(newZone: string, newYear: number, newQuarter: number) {
    setIsLoading(true)
    const data = await getTargetsForPeriod({
      zonal_office: newZone,
      period_type: 'quarterly',
      period_year: newYear,
      period_value: newQuarter,
    })
    setTargets(Object.fromEntries(activityTypes.map(t => [t, data[t] ? String(data[t]) : ''])))
    setIsLoading(false)
  }

  function handleZoneChange(newZone: string) {
    setZone(newZone)
    updateSearchParams({ zone: newZone })
    loadTargets(newZone, year, quarter)
  }

  function handleYearChange(newYear: number) {
    setYear(newYear)
    updateSearchParams({ year: String(newYear) })
    loadTargets(zone, newYear, quarter)
  }

  function handleQuarterChange(newQuarter: number) {
    setQuarter(newQuarter)
    updateSearchParams({ quarter: String(newQuarter) })
    loadTargets(zone, year, newQuarter)
  }

  async function handleSave() {
    startTransition(async () => {
      const result = await upsertTargets({
        zonal_office: zone,
        period_type: 'quarterly',
        period_year: year,
        period_value: quarter,
        targets: activityTypes.map(t => ({
          activity_type: t,
          target_count: parseInt(targets[t] ?? '0') || 0,
        })),
      })

      if ('error' in result) {
        setToast({ type: 'error', message: result.error })
      } else {
        setToast({ type: 'success', message: 'Targets saved.' })
      }
      setTimeout(() => setToast(null), 4000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Zone selector */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            Zonal Office
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer group">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                    zone === key
                      ? 'border-slate-900 bg-slate-900'
                      : 'border-slate-300 group-hover:border-slate-500'
                  )}
                  onClick={() => handleZoneChange(key)}
                >
                  {zone === key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium cursor-pointer select-none transition-colors',
                    zone === key ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
                  )}
                  onClick={() => handleZoneChange(key)}
                >
                  {label}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quarter selector */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            Quarter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={String(year)} onValueChange={v => handleYearChange(parseInt(v))}>
              <SelectTrigger className="h-9 w-24 text-sm border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => (
                  <SelectItem key={y} value={String(y)} className="text-sm">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              {[1, 2, 3, 4].map(q => (
                <label key={q} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                      quarter === q
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-300 group-hover:border-slate-500'
                    )}
                    onClick={() => handleQuarterChange(q)}
                  >
                    {quarter === q && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium cursor-pointer select-none transition-colors',
                      quarter === q ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
                    )}
                    onClick={() => handleQuarterChange(q)}
                  >
                    Q{q}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets grid */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Targets — {ZONAL_OFFICE_LABELS[zone as keyof typeof ZONAL_OFFICE_LABELS]} &middot; Q{quarter} {year}
            </CardTitle>
            <p className="text-xs text-slate-400">Leave blank for no target</p>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'divide-y divide-slate-50 transition-opacity duration-150',
              isLoading && 'opacity-40 pointer-events-none'
            )}
          >
            {activityTypes.map(type => (
              <div key={type} className="flex items-center justify-between py-3">
                <span className="text-sm font-medium text-slate-700">
                  {ACTIVITY_TYPE_LABELS[type]}
                </span>
                <Input
                  type="number"
                  min="0"
                  placeholder="—"
                  value={targets[type] ?? ''}
                  onChange={e => setTargets(prev => ({ ...prev, [type]: e.target.value }))}
                  className="w-24 h-8 text-sm text-right border-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium',
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {toast.message}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending || isLoading}
          className="bg-slate-900 hover:bg-slate-700 text-white px-8 h-10 text-sm font-medium tracking-wide"
        >
          {isPending ? 'Saving…' : 'Save Targets'}
        </Button>
      </div>
    </div>
  )
}
