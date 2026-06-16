import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeeklyReportData } from '@/actions/weekly-report.actions'
import { buildWeeklyReportWorkbook } from '@/lib/utils/weekly-report-export'
import { zonalOffices } from '@/lib/validations/activity.schema'
import type { WeeklyReportData } from '@/types/weekly-report.types'

function defaultWeekEnding(): string {
  const d = new Date()
  const diff = (d.getDay() - 5 + 7) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const week = searchParams.get('week') ?? defaultWeekEnding()
  const zoneParam = searchParams.get('zone') ?? undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office')
    .eq('id', user.id)
    .single()

  // Officers → their own zone only; admins/viewers → requested zone or all offices.
  let offices: string[]
  if (profile?.role === 'zonal_officer') {
    offices = profile.zonal_office ? [profile.zonal_office] : []
  } else if (zoneParam && zoneParam !== 'all') {
    offices = [zoneParam]
  } else {
    offices = [...zonalOffices]
  }

  const reports: WeeklyReportData[] = []
  for (const zone of offices) {
    const data = await getWeeklyReportData(zone, week)
    if (!('error' in data)) reports.push(data as WeeklyReportData)
  }

  if (reports.length === 0) {
    return NextResponse.json({ error: 'No report data available' }, { status: 404 })
  }

  const buffer = buildWeeklyReportWorkbook(reports)
  const filename = `weekly-report-${week}`
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    },
  })
}
