import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportToExcel, exportToPDF } from '@/lib/utils/export-helpers'
import { getReportRange } from '@/lib/utils/date-helpers'
import type { Activity } from '@/types/activity.types'
import type { ReportPeriod } from '@/lib/utils/date-helpers'
import type { ZonalOffice } from '@/types/database.types'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const formatParam = searchParams.get('format') as 'pdf' | 'excel' | null
  const period = (searchParams.get('period') ?? 'monthly') as ReportPeriod
  const zone = searchParams.get('zone') ?? undefined

  const now = new Date()
  const num = (key: string, fallback: number) => {
    const v = parseInt(searchParams.get(key) ?? '')
    return Number.isNaN(v) ? fallback : v
  }
  const year = num('year', now.getFullYear())
  const quarter = num('quarter', Math.floor(now.getMonth() / 3) + 1)
  const month = num('month', now.getMonth() + 1)
  const week = num('week', 1)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office')
    .eq('id', user.id)
    .single()

  const { from: fromStr, to: toStr } = getReportRange(period, { year, quarter, month, week })

  let query = supabase
    .from('activities')
    .select('*')
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('date', fromStr)
    .lte('date', toStr)
    .order('date', { ascending: false })

  if (profile?.role === 'zonal_officer' && profile.zonal_office) {
    query = query.eq('zonal_office', profile.zonal_office)
  } else if (zone && zone !== 'all' && profile?.role === 'regional_admin') {
    query = query.eq('zonal_office', zone as ZonalOffice)
  }

  const { data: activities, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const data = (activities ?? []) as Activity[]
  const filename = `argus-${period}-report-${format(new Date(), 'yyyy-MM-dd')}`

  if (formatParam === 'excel') {
    const buffer = exportToExcel(data, filename)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    })
  }

  // Default: PDF
  const buffer = exportToPDF(data, period, zone)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  })
}
