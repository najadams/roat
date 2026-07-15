import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportButton } from '@/components/shared/ExportButton'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ActivityBreakdownChart } from '@/components/dashboard/ActivityBreakdownChart'
import { ReportsPeriodSelector } from '../reports/reports-period-selector'
import { getReportRange } from '@/lib/utils/date-helpers'
import { formatDate } from '@/lib/utils/date-helpers'

export const metadata = { title: 'Accra Reports — ROAT' }

type AccraActivity = {
  id: string
  date: string
  company_name: string
  location: string
  status: string
  sector: string | null
  detail: string | null
  outcome: string | null
}

interface PageProps {
  searchParams: Promise<{
    period?: string
    year?: string
    quarter?: string
    month?: string
    week?: string
  }>
}

function monthKey(date: string) {
  return date.slice(0, 7)
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  })
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export default async function AccraReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office')
    .eq('id', user.id)
    .single()

  const canViewAccra =
    profile?.role === 'regional_admin' ||
    (profile?.role === 'zonal_officer' && profile.zonal_office === 'accra')

  if (!canViewAccra) redirect('/module-a/reports')

  const now = new Date()
  const period = (params.period ?? 'monthly') as 'weekly' | 'monthly' | 'quarterly' | 'annual'
  const year = parseInt(params.year ?? now.getFullYear().toString())
  const quarter = parseInt(params.quarter ?? String(Math.floor(now.getMonth() / 3) + 1))
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const week = parseInt(params.week ?? String(getISOWeek(now)))
  const { from, to } = getReportRange(period, { year, quarter, month, week })

  const { data } = await supabase
    .from('activities')
    .select('id, date, company_name, location, status, sector, detail, outcome')
    .eq('zonal_office', 'accra')
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  const activities = (data ?? []) as AccraActivity[]
  const total = activities.length
  const completed = activities.filter(a => a.status === 'completed').length
  const pending = activities.filter(a => a.status === 'pending').length
  const inProgress = activities.filter(a => a.status === 'in_progress').length

  const statusData = Object.entries(
    activities.reduce((acc, activity) => {
      const label = activity.status.replace(/_/g, ' ')
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  const monthlyTrend = Object.entries(
    activities.reduce((acc, activity) => {
      const key = monthKey(activity.date)
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ label: monthLabel(key), count }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Accra Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Custom activity summary for Accra operations.
          </p>
        </div>
        <ExportButton period={period} zone="accra" year={year} quarter={quarter} month={month} week={week} />
      </div>

      <ReportsPeriodSelector
        period={period}
        year={year}
        quarter={quarter}
        month={month}
        week={week}
        zone="accra"
        isAdmin={false}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { title: 'Activities', value: total, note: 'Accra records in period' },
          { title: 'Completed', value: completed, note: 'Completed records' },
          { title: 'In Progress', value: inProgress, note: 'Active records' },
          { title: 'Pending', value: pending, note: 'Pending records' },
        ].map(item => (
          <Card key={item.title} className="border-slate-100 shadow-sm">
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-3xl font-semibold text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs text-slate-400">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ActivityBreakdownChart data={statusData} />
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTrend.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {monthlyTrend.map(row => (
                  <div key={row.label} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-slate-700">{row.label}</span>
                    <span className="text-sm font-semibold text-slate-900">{row.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-slate-400">No trend data for this period</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Activity Descriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Date', 'Activity Description', 'Status'].map(header => (
                    <th key={header} className="text-left py-2.5 pr-4 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map(activity => (
                  <tr key={activity.id} className="border-b border-slate-50 align-top">
                    <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{formatDate(activity.date)}</td>
                    <td className="py-3 pr-4 text-slate-800 font-medium min-w-[280px]">
                      {activity.detail ?? '—'}
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={activity.status} /></td>
                  </tr>
                ))}
                {activities.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-sm text-slate-400">
                      No Accra activities found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
