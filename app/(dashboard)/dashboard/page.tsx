import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { ZonalSummaryChart } from '@/components/dashboard/ZonalSummaryChart'
import { ActivityBreakdownChart } from '@/components/dashboard/ActivityBreakdownChart'
import { WebinarProgressChart } from '@/components/dashboard/WebinarProgressChart'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import {
  ClipboardList, Radio, CheckCircle2, AlertTriangle, TrendingUp, Globe,
  UserPlus, Clock, BarChart3,
} from 'lucide-react'
import type { WebinarWithTasks } from '@/types/webinar.types'
import type { ZonalData } from '@/components/dashboard/ZonalSummaryChart'

export const metadata = { title: 'Dashboard — ROAT' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office, full_name')
    .eq('id', user.id)
    .single()

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthEndStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`

  // ── Module A: activities this month ────────────────────────────────────────
  let activitiesQuery = supabase
    .from('activities')
    .select('id, activity_type, zonal_office, status, date')
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('date', monthStart)
    .lte('date', monthEndStr)

  if (profile?.role === 'zonal_officer' && profile.zonal_office) {
    activitiesQuery = activitiesQuery.eq('zonal_office', profile.zonal_office)
  }

  const { data: activities } = await activitiesQuery

  // ── Module A: all pending (for stale alert context) ────────────────────────
  let pendingQuery = supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'pending')

  if (profile?.role === 'zonal_officer' && profile.zonal_office) {
    pendingQuery = pendingQuery.eq('zonal_office', profile.zonal_office)
  }
  const { count: totalPending } = await pendingQuery

  // ── Aggregate by type and zone ─────────────────────────────────────────────
  const totalActivities   = activities?.length ?? 0
  const completedActivities = activities?.filter(a => a.status === 'completed').length ?? 0
  const pendingThisMonth  = activities?.filter(a => a.status === 'pending').length ?? 0
  const completionRate    = totalActivities > 0
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0

  const newRegistrations = activities?.filter(a => a.activity_type === 'new_registration').length ?? 0

  // Activity breakdown by type (for pie chart)
  const byType: Record<string, number> = {}
  const byZone: Record<string, Record<string, number>> = {}

  for (const a of activities ?? []) {
    byType[a.activity_type] = (byType[a.activity_type] ?? 0) + 1
    if (!byZone[a.zonal_office]) byZone[a.zonal_office] = {}
    byZone[a.zonal_office][a.activity_type] = (byZone[a.zonal_office][a.activity_type] ?? 0) + 1
  }

  // Pie chart: only types with > 0 activities, use full labels
  const typeChartData = Object.entries(byType)
    .map(([type, count]) => ({
      name: ACTIVITY_TYPE_LABELS[type] ?? type.replace(/_/g, ' '),
      value: count,
    }))
    .sort((a, b) => b.value - a.value)

  // Stacked bar: ALL activity types as keys per zone
  const activityTypeEntries = Object.entries(ACTIVITY_TYPE_LABELS)
  const zoneChartData = Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => {
    const row: ZonalData = { zone: label }
    for (const [typeKey] of activityTypeEntries) {
      row[typeKey] = byZone[key]?.[typeKey] ?? 0
    }
    return row
  })

  const activityTypeDefs = activityTypeEntries.map(([key, label]) => ({ key, label }))

  // Zone performance table (admin only)
  const zonePerformance = Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => {
    const zoneActivities = activities?.filter(a => a.zonal_office === key) ?? []
    const total     = zoneActivities.length
    const completed = zoneActivities.filter(a => a.status === 'completed').length
    const pending   = zoneActivities.filter(a => a.status === 'pending').length
    const rate      = total > 0 ? Math.round((completed / total) * 100) : 0
    const topType   = Object.entries(
      zoneActivities.reduce((acc, a) => {
        acc[a.activity_type] = (acc[a.activity_type] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).sort((a, b) => b[1] - a[1])[0]

    return { label, total, completed, pending, rate, topType: topType ? ACTIVITY_TYPE_LABELS[topType[0]] ?? topType[0] : '—' }
  })

  // ── Module B: webinars ─────────────────────────────────────────────────────
  const { data: webinarsRaw } = await supabase
    .from('webinars')
    .select('*, webinar_tasks(*)')
    .is('deleted_at', null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webinarList = ((webinarsRaw ?? []) as any[]) as WebinarWithTasks[]
  const totalWebinars  = webinarList.length
  const delayedWebinars = webinarList.filter(w =>
    w.webinar_tasks?.some(t => t.is_delayed || (t.status === 'in_progress' && t.deadline && new Date() > new Date(t.deadline)))
  ).length
  const completedWebinars = webinarList.filter(w =>
    w.webinar_tasks?.every(t => t.status === 'completed')
  ).length

  const avgProgress = webinarList.length > 0
    ? Math.round(
        webinarList.reduce((sum, w) => {
          const tasks = w.webinar_tasks ?? []
          const done  = tasks.filter(t => t.status === 'completed').length
          return sum + Math.round((done / 9) * 100)
        }, 0) / webinarList.length
      )
    : 0

  const webinarChartData = webinarList.map(w => {
    const tasks = w.webinar_tasks ?? []
    const done  = tasks.filter(t => t.status === 'completed').length
    return {
      country:    w.country,
      progress:   Math.round((done / 9) * 100),
      hasDelayed: tasks.some(t => t.is_delayed || (t.status === 'in_progress' && t.deadline && new Date() > new Date(t.deadline))),
    }
  })

  const isAdmin    = profile?.role === 'regional_admin'
  const monthName  = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Good {getTimeOfDay()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Operations overview for {monthName}.
        </p>
      </div>

      {/* ── Module A KPIs ────────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Module A — Zonal Activities
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Activities This Month"
            value={totalActivities}
            subtitle={monthName}
            icon={ClipboardList}
          />
          <StatsCard
            title="New Registrations"
            value={newRegistrations}
            subtitle={`of ${totalActivities} this month`}
            icon={UserPlus}
            variant="success"
          />
          <StatsCard
            title="Pending"
            value={totalPending ?? 0}
            subtitle="Across all periods"
            icon={Clock}
            variant={(totalPending ?? 0) > 0 ? 'warning' : 'default'}
          />
          <StatsCard
            title="Completion Rate"
            value={`${completionRate}%`}
            subtitle={`${completedActivities} of ${totalActivities} completed`}
            icon={TrendingUp}
            variant={completionRate >= 70 ? 'success' : completionRate >= 40 ? 'warning' : 'default'}
          />
        </div>
      </section>

      {/* ── Activity Charts ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie: breakdown by type */}
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
                Activity Breakdown — {monthName}
              </CardTitle>
              <span className="text-xs text-slate-400">{totalActivities} total</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-5 pb-5">
            <ActivityBreakdownChart data={typeChartData} />
          </CardContent>
        </Card>

        {/* Webinar progress */}
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-0 pt-5 px-5">
            <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
              Webinar Progress by Country
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-5 pb-5 overflow-y-auto max-h-72">
            <WebinarProgressChart data={webinarChartData} />
          </CardContent>
        </Card>
      </div>

      {/* ── Zone Analysis (admin) ─────────────────────────────────────────── */}
      {isAdmin && (
        <section className="space-y-6">
          {/* Stacked bar: all activity types per zone */}
          <Card className="border-slate-100 shadow-sm">
            <CardHeader className="pb-0 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
                  Activities by Zone &amp; Type — {monthName}
                </CardTitle>
                <span className="text-xs text-slate-400">Stacked by activity type</span>
              </div>
            </CardHeader>
            <CardContent className="pt-2 px-5 pb-5">
              <ZonalSummaryChart data={zoneChartData} activityTypes={activityTypeDefs} />
            </CardContent>
          </Card>

          {/* Zone performance table */}
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-0 pt-5 px-5 border-b border-slate-100">
              <div className="flex items-center gap-2 pb-3">
                <BarChart3 className="h-4 w-4 text-slate-400" />
                <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
                  Zone Performance — {monthName}
                </CardTitle>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Zone', 'Total', 'Completed', 'Pending', 'Rate', 'Top Activity'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold tracking-widest uppercase text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zonePerformance.map(row => (
                    <tr key={row.label} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-slate-800">{row.label}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{row.total}</td>
                      <td className="px-5 py-3 text-sm text-emerald-600 font-medium">{row.completed}</td>
                      <td className="px-5 py-3 text-sm">
                        {row.pending > 0
                          ? <span className="text-amber-600 font-medium">{row.pending}</span>
                          : <span className="text-slate-400">{row.pending}</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                row.rate >= 70 ? 'bg-emerald-400' : row.rate >= 40 ? 'bg-amber-400' : row.total === 0 ? 'bg-slate-200' : 'bg-red-400'
                              }`}
                              style={{ width: `${row.rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{row.rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{row.topType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* ── Module B KPIs ────────────────────────────────────────────────── */}
      <section>
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-3">
          Module B — Webinar Tracker
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Webinars"
            value={totalWebinars}
            subtitle="Countries tracked"
            icon={Radio}
          />
          <StatsCard
            title="Completed"
            value={completedWebinars}
            subtitle={`of ${totalWebinars} webinars`}
            icon={CheckCircle2}
            variant="success"
          />
          <StatsCard
            title="Avg. Progress"
            value={`${avgProgress}%`}
            subtitle="Across all countries"
            icon={TrendingUp}
            variant={avgProgress >= 70 ? 'success' : 'default'}
          />
          <StatsCard
            title="Delayed"
            value={delayedWebinars}
            subtitle="Countries with overdue tasks"
            icon={AlertTriangle}
            variant={delayedWebinars > 0 ? 'danger' : 'default'}
          />
        </div>
      </section>
    </div>
  )
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
