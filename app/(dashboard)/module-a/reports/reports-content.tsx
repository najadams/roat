import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportButton } from '@/components/shared/ExportButton'
import { ActivityBreakdownChart } from '@/components/dashboard/ActivityBreakdownChart'
import { ZonalSummaryChart } from '@/components/dashboard/ZonalSummaryChart'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import type { Database, ZonalOffice } from '@/types/database.types'
import { ReportsPeriodSelector } from './reports-period-selector'
import { getTargetsForPeriod } from '@/actions/target.actions'
import { getMonthOfWeek } from '@/lib/utils/date-helpers'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ReportsContentProps {
  profile: Profile | null
  searchParams: {
    period?: string
    zone?: string
    year?: string
    quarter?: string
    month?: string
    week?: string
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getWeekDateRange(week: number, year: number): { from: string; to: string } {
  // Find Monday of the given ISO week
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - (dow - 1) + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

export async function ReportsContent({ profile, searchParams }: ReportsContentProps) {
  const supabase = await createClient()
  const period = (searchParams.period ?? 'monthly') as 'weekly' | 'monthly' | 'quarterly' | 'annual'
  const zone = searchParams.zone
  const now = new Date()
  const year = parseInt(searchParams.year ?? now.getFullYear().toString())
  const quarter = parseInt(searchParams.quarter ?? String(Math.floor(now.getMonth() / 3) + 1))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))
  const week = parseInt(searchParams.week ?? String(getISOWeek(now)))

  // Build date range
  let fromDate: string
  let toDate: string

  if (period === 'weekly') {
    const range = getWeekDateRange(week, year)
    fromDate = range.from
    toDate = range.to
  } else if (period === 'monthly') {
    fromDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    toDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  } else if (period === 'quarterly') {
    const qStart = (quarter - 1) * 3 + 1
    const qEnd = qStart + 2
    fromDate = `${year}-${String(qStart).padStart(2, '0')}-01`
    const lastDay = new Date(year, qEnd, 0).getDate()
    toDate = `${year}-${String(qEnd).padStart(2, '0')}-${lastDay}`
  } else {
    fromDate = `${year}-01-01`
    toDate = `${year}-12-31`
  }

  let query = supabase
    .from('activities')
    .select('activity_type, zonal_office, status, date')
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('date', fromDate)
    .lte('date', toDate)

  if (zone && zone !== 'all' && profile?.role !== 'zonal_officer') {
    query = query.eq('zonal_office', zone as ZonalOffice)
  }

  const { data: activities } = await query

  // Aggregate by type
  const byType: Record<string, number> = {}
  const byZone: Record<string, Record<string, number>> = {}

  for (const a of activities ?? []) {
    byType[a.activity_type] = (byType[a.activity_type] ?? 0) + 1

    if (!byZone[a.zonal_office]) byZone[a.zonal_office] = {}
    byZone[a.zonal_office][a.activity_type] = (byZone[a.zonal_office][a.activity_type] ?? 0) + 1
  }

  const typeChartData = Object.entries(byType).map(([type, count]) => ({
    name: ACTIVITY_TYPE_LABELS[type] ?? type,
    value: count,
  }))

  // Always show all 9 types (zeros included) for the summary table
  const typeTableData = Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => ({
    name: label,
    value: byType[key] ?? 0,
  })).sort((a, b) => b.value - a.value)

  const zoneChartData = Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => ({
    zone: label,
    new_registration: byZone[key]?.new_registration ?? 0,
    site_visit: byZone[key]?.site_visit ?? 0,
    stakeholder_engagement: byZone[key]?.stakeholder_engagement ?? 0,
    total: Object.values(byZone[key] ?? {}).reduce((a, b) => a + b, 0),
  }))

  const total = activities?.length ?? 0
  const completed = activities?.filter(a => a.status === 'completed').length ?? 0
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const isAdmin = profile?.role === 'regional_admin'

  // Determine the single zone in scope (needed to show targets)
  const scopedZone = profile?.role === 'zonal_officer'
    ? profile.zonal_office
    : (zone && zone !== 'all' ? zone : null)

  // Resolve the active quarter for the target label
  const activeQuarter =
    period === 'weekly' ? Math.ceil(getMonthOfWeek(week, year) / 3) :
    period === 'monthly' ? Math.ceil(month / 3) :
    period === 'quarterly' ? quarter : 0

  // Fetch targets only when a single zone is visible
  let targetsByType: Record<string, number> = {}
  if (scopedZone) {
    const targetPeriodValue =
      period === 'weekly' ? week :
      period === 'monthly' ? month :
      period === 'quarterly' ? quarter : 0

    targetsByType = await getTargetsForPeriod({
      zonal_office: scopedZone,
      period_type: period,
      period_year: year,
      period_value: targetPeriodValue,
    })
  }

  const showTargets = scopedZone !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Activity summary for {period} period
          </p>
        </div>
        <ExportButton period={period} zone={zone} />
      </div>

      <ReportsPeriodSelector
        period={period}
        year={year}
        quarter={quarter}
        month={month}
        week={week}
        zone={zone}
        isAdmin={isAdmin}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Total Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold text-slate-900">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold text-emerald-600">{completed}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold text-slate-900">{completionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
              Activity Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ActivityBreakdownChart data={typeChartData} />
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
                Activities by Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ZonalSummaryChart
                data={zoneChartData}
                activityTypes={[
                  { key: 'new_registration', label: 'New Registration' },
                  { key: 'site_visit', label: 'Site Visit' },
                  { key: 'stakeholder_engagement', label: 'Stakeholder Engagement' },
                ]}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity type table */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Activity Type Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2.5 pr-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Activity Type</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Count</th>
                  {showTargets && (
                    <>
                      <th className="text-right py-2.5 px-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                        {activeQuarter > 0 ? `Q${activeQuarter} Target` : 'Annual Target'}
                      </th>
                      <th className="text-left py-2.5 pl-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">Progress</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {typeTableData.map(item => {
                  const typeKey = Object.entries(ACTIVITY_TYPE_LABELS).find(([, v]) => v === item.name)?.[0]
                  const target = typeKey ? (targetsByType[typeKey] ?? null) : null
                  const pct = target && target > 0 ? Math.min(Math.round((item.value / target) * 100), 100) : null
                  const overPct = target && target > 0 ? Math.round((item.value / target) * 100) : null

                  return (
                    <tr key={item.name} className="border-b border-slate-50">
                      <td className="py-3 pr-4 text-slate-700 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-right text-slate-900 font-semibold">{item.value}</td>
                      {showTargets && (
                        <>
                          <td className="py-3 px-4 text-right text-slate-500">
                            {target ?? '—'}
                          </td>
                          <td className="py-3 pl-4 min-w-[160px]">
                            {pct !== null && target ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      (overPct ?? 0) >= 100
                                        ? 'bg-emerald-500'
                                        : (overPct ?? 0) >= 50
                                        ? 'bg-amber-400'
                                        : 'bg-red-400'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-semibold w-10 text-right ${
                                  (overPct ?? 0) >= 100
                                    ? 'text-emerald-600'
                                    : (overPct ?? 0) >= 50
                                    ? 'text-amber-600'
                                    : 'text-red-500'
                                }`}>
                                  {overPct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="py-3 pr-4 text-slate-900 font-semibold">Total</td>
                  <td className="py-3 px-4 text-right text-slate-900 font-semibold">{total}</td>
                  {showTargets && <td colSpan={2} />}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
