import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTargetsForPeriod } from '@/actions/target.actions'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PerformancePeriodSelector } from './period-selector'
import { getMonthOfWeek } from '@/lib/utils/date-helpers'
import type { ZonalOffice } from '@/types/database.types'
import { cn } from '@/lib/utils/cn'
import { Target } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Performance Overview — ROAT' }

const ZONES = Object.keys(ZONAL_OFFICE_LABELS) as ZonalOffice[]
const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_LABELS)

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getWeekDateRange(week: number, year: number): { from: string; to: string } {
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - (dow - 1) + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

function zoneTier(met: number, total: number): {
  label: string
  dot: string
  bg: string
  text: string
  border: string
} {
  if (total === 0) return {
    label: 'No Targets',
    dot: 'bg-slate-300',
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-slate-200',
  }
  const score = met / total
  if (score >= 1) return {
    label: 'Thriving',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  }
  if (score >= 0.75) return {
    label: 'On Track',
    dot: 'bg-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  }
  if (score >= 0.5) return {
    label: 'At Risk',
    dot: 'bg-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  }
  return {
    label: 'Falling Behind',
    dot: 'bg-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  }
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string
    year?: string
    quarter?: string
    month?: string
    week?: string
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'regional_admin') redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const period = (params.period ?? 'weekly') as 'weekly' | 'monthly' | 'quarterly' | 'annual'
  const year = parseInt(params.year ?? String(now.getFullYear()))
  const quarter = parseInt(params.quarter ?? String(Math.floor(now.getMonth() / 3) + 1))
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const week = parseInt(params.week ?? String(getISOWeek(now)))

  // Build cumulative date range: from the start of the containing quarter
  // to the end of the selected period. This lets weekly/monthly views show
  // how much of the quarterly target has been achieved so far.
  let fromDate: string
  let toDate: string
  let activeQuarter: number

  if (period === 'weekly') {
    const weekMonth = getMonthOfWeek(week, year)
    activeQuarter = Math.ceil(weekMonth / 3)
    const qStartMonth = (activeQuarter - 1) * 3 + 1
    fromDate = `${year}-${String(qStartMonth).padStart(2, '0')}-01`
    const range = getWeekDateRange(week, year)
    toDate = range.to
  } else if (period === 'monthly') {
    activeQuarter = Math.ceil(month / 3)
    const qStartMonth = (activeQuarter - 1) * 3 + 1
    fromDate = `${year}-${String(qStartMonth).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    toDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  } else if (period === 'quarterly') {
    activeQuarter = quarter
    const qStartMonth = (quarter - 1) * 3 + 1
    const qEndMonth = quarter * 3
    fromDate = `${year}-${String(qStartMonth).padStart(2, '0')}-01`
    const lastDay = new Date(year, qEndMonth, 0).getDate()
    toDate = `${year}-${String(qEndMonth).padStart(2, '0')}-${lastDay}`
  } else {
    activeQuarter = 0
    fromDate = `${year}-01-01`
    toDate = `${year}-12-31`
  }

  // Fetch all activities in period (all zones)
  const { data: activities } = await supabase
    .from('activities')
    .select('activity_type, zonal_office')
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('date', fromDate)
    .lte('date', toDate)

  // Aggregate actuals by zone → activity type
  const byZone: Record<string, Record<string, number>> = {}
  for (const zone of ZONES) byZone[zone] = {}
  for (const a of activities ?? []) {
    byZone[a.zonal_office][a.activity_type] = (byZone[a.zonal_office][a.activity_type] ?? 0) + 1
  }

  // Fetch quarterly targets for all zones in parallel.
  // getTargetsForPeriod resolves to the containing quarter automatically.
  const targetResults = await Promise.all(
    ZONES.map(zone =>
      getTargetsForPeriod({
        zonal_office: zone,
        period_type: period,
        period_year: year,
        period_value: period === 'weekly' ? week : period === 'monthly' ? month : period === 'quarterly' ? quarter : 0,
      })
    )
  )
  const targetsByZone: Record<string, Record<string, number>> = {}
  ZONES.forEach((zone, i) => { targetsByZone[zone] = targetResults[i] })

  // Compute zone summary stats
  const zoneSummary = ZONES.map(zone => {
    const targets = targetsByZone[zone]
    const typesWithTargets = ACTIVITY_TYPES.filter(t => (targets[t] ?? 0) > 0)
    const met = typesWithTargets.filter(t => (byZone[zone][t] ?? 0) >= targets[t])
    return {
      zone,
      label: ZONAL_OFFICE_LABELS[zone as keyof typeof ZONAL_OFFICE_LABELS],
      met: met.length,
      total: typesWithTargets.length,
      tier: zoneTier(met.length, typesWithTargets.length),
    }
  })

  // Period label for heading — weekly/monthly show Q-to-date context
  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const periodLabel =
    period === 'weekly' ? `Week ${week}, ${year} — Q${activeQuarter} to date` :
    period === 'monthly' ? `${MONTH_NAMES[month - 1]} ${year} — Q${activeQuarter} to date` :
    period === 'quarterly' ? `Q${quarter} ${year}` :
    `Full Year ${year}`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Performance Overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Target vs. actual across all zonal offices — {periodLabel}
          </p>
        </div>
        <Link
          href={`/admin/targets?zone=kumasi&year=${year}&quarter=${activeQuarter > 0 ? activeQuarter : quarter}`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors whitespace-nowrap"
        >
          <Target className="h-4 w-4" />
          Edit Targets
        </Link>
      </div>

      <Suspense>
        <PerformancePeriodSelector />
      </Suspense>

      {/* Zone Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {zoneSummary.map(({ zone, label, met, total, tier }) => {
          const targetsHref = `/admin/targets?zone=${zone}&year=${year}&quarter=${activeQuarter > 0 ? activeQuarter : quarter}`
          return (
            <div
              key={zone}
              className={cn(
                'rounded-lg border px-4 py-3',
                tier.bg,
                tier.border,
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', tier.dot)} />
                <span className="text-sm font-semibold text-slate-900">{label}</span>
              </div>
              <p className={cn('text-xs font-medium', tier.text)}>{tier.label}</p>
              {total > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">{met}/{total} targets met</p>
              )}
              <Link
                href={targetsHref}
              className="text-xs text-slate-400 hover:text-slate-700 hover:underline underline-offset-2 mt-1.5 block"
              >
                {total === 0 ? 'Set targets →' : 'Edit targets →'}
              </Link>
            </div>
          )
        })}
      </div>

      {/* Cross-Zone Grid */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            Activity Type Breakdown by Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase whitespace-nowrap">
                    Activity Type
                  </th>
                  {ZONES.map(zone => (
                    <th
                      key={zone}
                      className="text-center px-4 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase whitespace-nowrap"
                    >
                      {ZONAL_OFFICE_LABELS[zone as keyof typeof ZONAL_OFFICE_LABELS]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACTIVITY_TYPES.map(type => (
                  <tr key={type} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                      {ACTIVITY_TYPE_LABELS[type]}
                    </td>
                    {ZONES.map(zone => {
                      const actual = byZone[zone][type] ?? 0
                      const target = targetsByZone[zone][type] ?? null
                      const pct = target && target > 0 ? Math.round((actual / target) * 100) : null
                      const barPct = pct !== null ? Math.min(pct, 100) : null

                      return (
                        <td key={zone} className="px-4 py-3.5 text-center align-middle">
                          {target ? (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-900">
                                {actual}
                                <span className="text-slate-400 font-normal">/{target}</span>
                              </span>
                              <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    (pct ?? 0) >= 100 ? 'bg-emerald-500' :
                                    (pct ?? 0) >= 50  ? 'bg-amber-400' :
                                    'bg-red-400'
                                  )}
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                              <span className={cn(
                                'text-xs font-semibold',
                                (pct ?? 0) >= 100 ? 'text-emerald-600' :
                                (pct ?? 0) >= 50  ? 'text-amber-600' :
                                'text-red-500'
                              )}>
                                {pct}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-sm font-semibold text-slate-900">{actual}</span>
                              <span className="text-xs text-slate-300">no target</span>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">Total</td>
                  {ZONES.map(zone => {
                    const total = Object.values(byZone[zone]).reduce((a, b) => a + b, 0)
                    return (
                      <td key={zone} className="px-4 py-3.5 text-center font-semibold text-slate-900">
                        {total}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-500">
        <span className="font-medium text-slate-400 uppercase tracking-wide">Legend</span>
        {[
          { dot: 'bg-emerald-500', label: 'Thriving (≥ 100%)' },
          { dot: 'bg-amber-400',   label: 'Progressing (50–99%)' },
          { dot: 'bg-red-400',     label: 'Falling Behind (< 50%)' },
          { dot: 'bg-slate-300',   label: 'No target set' },
        ].map(({ dot, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 rounded-full', dot)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
