import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWeeklyReportData } from '@/actions/weekly-report.actions'
import { WeeklyReportClient } from './weekly-report-client'
import type { WeeklyReportData } from '@/types/weekly-report.types'

export const metadata = { title: 'Weekly Report — ROAT' }

interface PageProps {
  searchParams: Promise<{ zone?: string; week?: string }>
}

function defaultWeekEnding(): string {
  // Most recent Friday (inclusive of today)
  const d = new Date()
  const day = d.getDay() // 0 Sun .. 6 Sat
  const diff = (day - 5 + 7) % 7 // days since Friday
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

export default async function WeeklyReportPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office, full_name')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'regional_admin'
  const isViewer = profile?.role === 'viewer'

  // Officers + viewers are scoped to their own zone; admins/viewers may pick.
  const zone =
    profile?.role === 'zonal_officer'
      ? profile.zonal_office ?? 'accra'
      : (params.zone ?? 'accra')
  const weekEnding = params.week ?? defaultWeekEnding()

  const data = await getWeeklyReportData(zone, weekEnding)
  if ('error' in data) {
    return <div className="text-sm text-red-500">Failed to load report: {data.error}</div>
  }

  return (
    <WeeklyReportClient
      data={data as WeeklyReportData}
      canEdit={!isViewer}
      canPickZone={isAdmin || isViewer}
    />
  )
}
