import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  exportAccraReportToPDF,
  exportToExcel,
  exportToPDF,
  type AccraActivityExportRow,
} from '@/lib/utils/export-helpers'
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
  } else {
    query = query.neq('zonal_office', 'accra')
  }

  const { data: activities, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const data = (activities ?? []) as Activity[]
  const filename = `argus-${period}-report-${format(new Date(), 'yyyy-MM-dd')}`

  const isAccraReport =
    zone === 'accra' ||
    (profile?.role === 'zonal_officer' && profile.zonal_office === 'accra')

  if (formatParam === 'excel') {
    const buffer = exportToExcel(data)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    })
  }

  // Default: PDF
  if (isAccraReport) {
    const creatorIds = Array.from(new Set(data.map(activity => activity.created_by)))
    let profileMap = new Map<string, { full_name: string | null; email: string | null }>()

    if (creatorIds.length > 0) {
      const profileClient = process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : supabase
      const { data: creators } = await profileClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds)

      profileMap = new Map(
        (creators ?? []).map(creator => [
          creator.id,
          { full_name: creator.full_name, email: creator.email },
        ])
      )
    }

    const accraRows: AccraActivityExportRow[] = data.map(activity => {
      const creator = profileMap.get(activity.created_by)
      return {
        ...activity,
        created_by_name: creator?.full_name ?? null,
        created_by_email: creator?.email ?? null,
      }
    })

    const buffer = exportAccraReportToPDF(accraRows, period, fromStr, toStr)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="argus-accra-${period}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf"`,
      },
    })
  }

  const buffer = exportToPDF(data, period, zone)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  })
}
