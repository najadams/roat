import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportButton } from '@/components/shared/ExportButton'
import { ActivityBreakdownChart } from '@/components/dashboard/ActivityBreakdownChart'
import { ZonalSummaryChart } from '@/components/dashboard/ZonalSummaryChart'
import {
  ACTIVITY_TYPE_LABELS,
  REGIONAL_ACTIVITY_TYPE_LABELS,
  REGIONAL_OFFICE_LABELS,
} from '@/types/activity.types'
import type { Database, ZonalOffice } from '@/types/database.types'
import { ReportsPeriodSelector } from './reports-period-selector'
import { getTargetsForPeriod } from '@/actions/target.actions'
import { getMonthOfWeek, getReportRange } from '@/lib/utils/date-helpers'

type Profile = Database['public']['Tables']['profiles']['Row']
type ReportActivity = {
  activity_type: string
  zonal_office: string
  status: string
  date: string
  company_name: string
  investment_amount: number | null
  investment_currency: string | null
  jobs_created: number | null
}

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

function normalizeCompanyName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getImpactKey(activity: ReportActivity) {
  return [
    normalizeCompanyName(activity.company_name),
    activity.date,
    activity.zonal_office,
    activity.investment_currency ?? '',
    activity.investment_amount ?? '',
    activity.jobs_created ?? '',
  ].join('|')
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

  // Build date range (shared with the export endpoint so they always agree)
  const { from: fromDate, to: toDate } = getReportRange(period, { year, quarter, month, week })

  let query = supabase
    .from('activities')
    .select('activity_type, zonal_office, status, date, company_name, investment_amount, investment_currency, jobs_created')
    .is('deleted_at', null)
    .neq('zonal_office', 'accra')
    .neq('status', 'cancelled')
    .gte('date', fromDate)
    .lte('date', toDate)

  if (zone && zone !== 'all' && profile?.role !== 'zonal_officer') {
    query = query.eq('zonal_office', zone as ZonalOffice)
  }

  const { data: activities } = await query
  const activityRows = (activities ?? []) as ReportActivity[]

  // Aggregate by type
  const byType: Record<string, number> = {}
  const byZone: Record<string, Record<string, number>> = {}

  for (const a of activityRows) {
    byType[a.activity_type] = (byType[a.activity_type] ?? 0) + 1

    if (!byZone[a.zonal_office]) byZone[a.zonal_office] = {}
    byZone[a.zonal_office][a.activity_type] = (byZone[a.zonal_office][a.activity_type] ?? 0) + 1
  }

  const typeChartData = Object.entries(byType)
    .filter(([type]) => type in REGIONAL_ACTIVITY_TYPE_LABELS)
    .map(([type, count]) => ({
      name: ACTIVITY_TYPE_LABELS[type] ?? type,
      value: count,
    }))
    .sort((a, b) => b.value - a.value)

  // Always show all 9 types (zeros included) for the summary table
  const typeTableData = Object.entries(REGIONAL_ACTIVITY_TYPE_LABELS).map(([key, label]) => ({
    name: label,
    value: byType[key] ?? 0,
  })).sort((a, b) => b.value - a.value)

  const activityTypeEntries = Object.entries(REGIONAL_ACTIVITY_TYPE_LABELS)
  const zoneChartData = Object.entries(REGIONAL_OFFICE_LABELS).map(([key, label]) => {
    const row: { zone: string; total: number; [key: string]: number | string } = {
      zone: label,
      total: Object.values(byZone[key] ?? {}).reduce((a, b) => a + b, 0),
    }

    for (const [typeKey] of activityTypeEntries) {
      row[typeKey] = byZone[key]?.[typeKey] ?? 0
    }

    return row
  })

  const total = activityRows.length
  const completed = activityRows.filter(a => a.status === 'completed').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
  const uniqueCompanies = new Set(
    activityRows.map(a => normalizeCompanyName(a.company_name)).filter(Boolean)
  ).size

  // ── Investment impact ──────────────────────────────────────────────────────
  // Sum investment per currency, deduplicating multi-activity rows logged for
  // the same company interaction. Mixing currencies in one total would mislead.
  const investmentByCurrency: Record<string, number> = {}
  let totalJobs = 0
  const countedImpactKeys = new Set<string>()
  for (const a of activityRows) {
    const hasImpact = a.investment_amount != null || (a.jobs_created ?? 0) > 0
    if (!hasImpact) continue

    const impactKey = getImpactKey(a)
    if (countedImpactKeys.has(impactKey)) continue
    countedImpactKeys.add(impactKey)

    if (a.investment_amount != null) {
      const cur = a.investment_currency ?? 'USD'
      investmentByCurrency[cur] = (investmentByCurrency[cur] ?? 0) + a.investment_amount
    }
    totalJobs += a.jobs_created ?? 0
  }
  const investmentEntries = Object.entries(investmentByCurrency).sort((a, b) => b[1] - a[1])
  const impactRecords = countedImpactKeys.size

  const isAdmin = profile?.role === 'regional_admin'

  // Determine the single zone in scope (needed to show targets)
  const scopedZone = profile?.role === 'zonal_officer'
    ? profile.zonal_office
    : (zone && zone !== 'all' && zone !== 'accra' ? zone : null)

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
        <ExportButton period={period} zone={zone} year={year} quarter={quarter} month={month} week={week} />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Activity Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold text-slate-900">{total}</p>
            <p className="mt-1 text-xs text-slate-400">Rows logged for the selected period</p>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Companies Served
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold text-slate-900">{uniqueCompanies}</p>
            <p className="mt-1 text-xs text-slate-400">Unique organisations in scope</p>
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
            <p className="mt-1 text-xs text-slate-400">Completed activity entries</p>
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
            <p className="mt-1 text-xs text-slate-400">{completed} of {total} entries completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Investment Impact */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Investment Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-100 p-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                Total Investment Value
              </p>
              {investmentEntries.length > 0 ? (
                <div className="mt-2 space-y-0.5">
                  {investmentEntries.map(([cur, amount]) => (
                    <p key={cur} className="text-2xl font-semibold text-slate-900">
                      {new Intl.NumberFormat('en-GB', {
                        style: 'currency',
                        currency: cur,
                        maximumFractionDigits: 0,
                      }).format(amount)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-2xl font-semibold text-slate-300">—</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-100 p-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                Jobs Created
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">
                {totalJobs.toLocaleString('en-GB')}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 p-4">
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                Impact Records
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {impactRecords.toLocaleString('en-GB')}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Impact values are deduplicated by company, date, zone, currency, investment value, and jobs so multi-activity logs do not overstate totals.
          </p>
        </CardContent>
      </Card>

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
                activityTypes={activityTypeEntries.map(([key, label]) => ({ key, label }))}
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
                  const typeKey = Object.entries(REGIONAL_ACTIVITY_TYPE_LABELS).find(([, v]) => v === item.name)?.[0]
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
