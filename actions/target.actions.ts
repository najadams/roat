'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getMonthOfWeek } from '@/lib/utils/date-helpers'
import type { ZonalOffice, ActivityType } from '@/types/database.types'

export async function upsertTargets(payload: {
  zonal_office: string
  period_type: 'quarterly'
  period_year: number
  period_value: number   // quarter: 1–4
  targets: { activity_type: string; target_count: number }[]
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'regional_admin') return { error: 'Insufficient permissions' }

  const toUpsert = payload.targets.filter(t => t.target_count > 0)
  const toDelete = payload.targets.filter(t => t.target_count === 0).map(t => t.activity_type as ActivityType)

  if (toUpsert.length > 0) {
    const rows = toUpsert.map(t => ({
      zonal_office: payload.zonal_office as ZonalOffice,
      activity_type: t.activity_type as ActivityType,
      period_type: 'quarterly' as const,
      period_year: payload.period_year,
      period_value: payload.period_value,
      target_count: t.target_count,
      created_by: user.id,
    }))

    const { error } = await supabase
      .from('activity_targets')
      .upsert(rows, {
        onConflict: 'zonal_office,activity_type,period_type,period_year,period_value',
      })

    if (error) return { error: error.message }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('activity_targets')
      .delete()
      .eq('zonal_office', payload.zonal_office as ZonalOffice)
      .eq('period_type', 'quarterly')
      .eq('period_year', payload.period_year)
      .eq('period_value', payload.period_value)
      .in('activity_type', toDelete)

    if (error) return { error: error.message }
  }

  revalidatePath('/admin/targets')
  revalidatePath('/admin/performance')
  revalidatePath('/module-a/reports')
  return { success: true }
}

/**
 * Resolves targets for any reporting period by mapping to the containing quarterly target.
 *
 * - weekly  → quarterly target for the quarter that week falls in
 * - monthly → quarterly target for the quarter that month falls in
 * - quarterly → direct quarterly target lookup
 * - annual → sum of all 4 quarterly targets for the year
 */
export async function getTargetsForPeriod(params: {
  zonal_office: string
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  period_year: number
  period_value: number
}): Promise<Record<string, number>> {
  const supabase = await createClient()

  if (params.period_type === 'annual') {
    // Sum all 4 quarters' targets
    const { data } = await supabase
      .from('activity_targets')
      .select('activity_type, target_count')
      .eq('zonal_office', params.zonal_office as ZonalOffice)
      .eq('period_type', 'quarterly')
      .eq('period_year', params.period_year)

    const result: Record<string, number> = {}
    for (const row of data ?? []) {
      result[row.activity_type as string] = (result[row.activity_type as string] ?? 0) + row.target_count
    }
    return result
  }

  // Resolve to the containing quarter
  let quarter: number
  if (params.period_type === 'weekly') {
    const month = getMonthOfWeek(params.period_value, params.period_year)
    quarter = Math.ceil(month / 3)
  } else if (params.period_type === 'monthly') {
    quarter = Math.ceil(params.period_value / 3)
  } else {
    quarter = params.period_value
  }

  const { data } = await supabase
    .from('activity_targets')
    .select('activity_type, target_count')
    .eq('zonal_office', params.zonal_office as ZonalOffice)
    .eq('period_type', 'quarterly')
    .eq('period_year', params.period_year)
    .eq('period_value', quarter)

  const result: Record<string, number> = {}
  for (const row of data ?? []) {
    result[row.activity_type as string] = row.target_count
  }
  return result
}
