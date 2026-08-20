'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { weeklyReportSchema } from '@/lib/validations/weekly-report.schema'
import { getTargetsForPeriod } from '@/actions/target.actions'
import { getWeeksInQuarter, formatDate } from '@/lib/utils/date-helpers'
import { CHECK_UP_CALL_OUTCOME_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import {
  WEEKLY_REPORT_CATEGORIES,
  THEMATIC_AREAS,
  type WeeklyReportData,
  type WeeklyCategoryRow,
  type WeeklyThematicRow,
} from '@/types/weekly-report.types'
import type { ActivityType, ZonalOffice } from '@/types/database.types'

/** 7-day window ending on (and including) the given week-ending date. */
function weekWindow(weekEnding: string): { from: string; to: string } {
  const end = new Date(weekEnding + 'T00:00:00')
  const start = new Date(end)
  start.setDate(end.getDate() - 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(start), to: fmt(end) }
}

export async function upsertWeeklyReport(formData: unknown) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office, full_name')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }
  if (profile.role === 'viewer') return { error: 'Viewers cannot submit reports' }

  const parsed = weeklyReportSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  // Officers are locked to their own zone; admins may target any zone.
  const zone = profile.role === 'regional_admin'
    ? parsed.data.zonal_office
    : profile.zonal_office
  if (!zone) return { error: 'No zonal office resolved for this report' }
  if (zone === 'accra') return { error: 'Use Accra Reports for Accra activity tracking' }

  const { error } = await supabase
    .from('weekly_reports')
    .upsert(
      {
        zonal_office: zone as ZonalOffice,
        week_ending: parsed.data.week_ending,
        officer_name: profile.full_name,
        key_highlights: parsed.data.key_highlights ?? null,
        challenges: parsed.data.challenges ?? null,
        narrative_summary: parsed.data.narrative_summary ?? null,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: 'zonal_office,week_ending' }
    )

  if (error) return { error: error.message }

  revalidatePath('/module-a/weekly-report')
  return { success: true }
}

export async function upsertWeeklyCategoryTargets(
  zonalOffice: string,
  weekEnding: string,
  entries: { category_key: string; target_count: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office')
    .eq('id', user.id)
    .single()
  if (!profile) return { error: 'Profile not found' }
  if (profile.role === 'viewer') return { error: 'Viewers cannot set targets' }

  const zone = profile.role === 'regional_admin' ? zonalOffice : profile.zonal_office
  if (!zone) return { error: 'No zonal office resolved' }
  if (zone === 'accra') return { error: 'Weekly category targets are not used for Accra reports' }

  // Targets with a value are upserted; zeros/blanks are cleared.
  const toUpsert = entries.filter(e => e.target_count > 0)
  const toClear = entries.filter(e => e.target_count <= 0).map(e => e.category_key)

  if (toUpsert.length > 0) {
    const { error } = await supabase.from('weekly_category_targets').upsert(
      toUpsert.map(e => ({
        zonal_office: zone as ZonalOffice,
        week_ending: weekEnding,
        category_key: e.category_key,
        target_count: e.target_count,
        created_by: user.id,
        updated_by: user.id,
      })),
      { onConflict: 'zonal_office,week_ending,category_key' }
    )
    if (error) return { error: error.message }
  }

  if (toClear.length > 0) {
    const { error } = await supabase
      .from('weekly_category_targets')
      .delete()
      .eq('zonal_office', zone as ZonalOffice)
      .eq('week_ending', weekEnding)
      .in('category_key', toClear)
    if (error) return { error: error.message }
  }

  revalidatePath('/module-a/weekly-report')
  return { success: true }
}

export async function getWeeklyReportData(
  zonalOffice: string,
  weekEnding: string
): Promise<WeeklyReportData | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const zone = zonalOffice as ZonalOffice
  if (zone === 'accra') return { error: 'Use Accra Reports for Accra activity tracking' }
  const { from, to } = weekWindow(weekEnding)
  const endDate = new Date(weekEnding + 'T00:00:00')
  const year = endDate.getFullYear()
  const quarter = Math.floor(endDate.getMonth() / 3) + 1
  const weeksInQuarter = getWeeksInQuarter(year, quarter).length || 13

  // Activities in the week (RLS already scopes officers to their zone)
  const { data: activities } = await supabase
    .from('activities')
    .select('id, activity_type, company_name, date, detail, action_required, call_outcome, outcome')
    .eq('zonal_office', zone)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  const rows = activities ?? []

  // Evidence attachments for those activities
  const ids = rows.map(r => r.id)
  const attByActivity: Record<string, string[]> = {}
  if (ids.length > 0) {
    const { data: atts } = await supabase
      .from('activity_attachments')
      .select('activity_id, file_name')
      .in('activity_id', ids)
    for (const a of atts ?? []) {
      ;(attByActivity[a.activity_id] ??= []).push(a.file_name ?? 'file')
    }
  }

  // Quarterly targets → derive weekly (fallback)
  const quarterlyTargets = await getTargetsForPeriod({
    zonal_office: zone,
    period_type: 'quarterly',
    period_year: year,
    period_value: quarter,
  })

  // Explicit weekly targets (override the derived value when present)
  const { data: weeklyTargetRows } = await supabase
    .from('weekly_category_targets')
    .select('category_key, target_count')
    .eq('zonal_office', zone)
    .eq('week_ending', weekEnding)
  const explicitTargets: Record<string, number> = {}
  for (const t of weeklyTargetRows ?? []) explicitTargets[t.category_key] = t.target_count

  // Section B — category rows
  const categories: WeeklyCategoryRow[] = WEEKLY_REPORT_CATEGORIES.map(cat => {
    const inCat = rows.filter(r => cat.types.includes(r.activity_type as ActivityType))
    const achieved = inCat.length
    const hasExplicit = cat.key in explicitTargets
    const quarterlyTarget = cat.types.reduce((s, t) => s + (quarterlyTargets[t] ?? 0), 0)
    const derived = quarterlyTarget > 0 ? Math.round(quarterlyTarget / weeksInQuarter) : null
    const target = hasExplicit ? explicitTargets[cat.key] : derived
    const variance = target !== null ? achieved - target : null
    const companies = inCat.map(r => r.company_name).filter(Boolean)
    const comments = companies.length
      ? companies.map((c, i) => `${i + 1}. ${c}`).join('\n')
      : ''
    return { key: cat.key, label: cat.label, target, targetExplicit: hasExplicit, achieved, variance, comments }
  })

  const totals = {
    target: categories.reduce((s, c) => s + (c.target ?? 0), 0),
    achieved: categories.reduce((s, c) => s + c.achieved, 0),
  }

  // Section D — thematic rows
  const thematic: WeeklyThematicRow[] = THEMATIC_AREAS.map(area => {
    const inArea = rows.filter(r => area.types.includes(r.activity_type as ActivityType))
    return {
      key: area.key,
      label: area.label,
      activityDescriptions: inArea.map(r => r.detail).filter(Boolean).join('\n'),
      dates: inArea.map(r => formatDate(r.date)).join(', '),
      partners: inArea.map(r => r.company_name).filter(Boolean).join('; '),
      outcomes: inArea
        .map(r => r.outcome || (r.call_outcome ? CHECK_UP_CALL_OUTCOME_LABELS[r.call_outcome] : null))
        .filter(Boolean)
        .join('\n'),
      evidence: inArea.flatMap(r => attByActivity[r.id] ?? []).join(', '),
      comments: inArea.map(r => r.action_required).filter(Boolean).join('\n'),
    }
  })

  // Section C — narrative
  const { data: narrativeRow } = await supabase
    .from('weekly_reports')
    .select('id, zonal_office, week_ending, officer_name, key_highlights, challenges, narrative_summary')
    .eq('zonal_office', zone)
    .eq('week_ending', weekEnding)
    .maybeSingle()

  return {
    zonalOffice: zone,
    zoneLabel: ZONAL_OFFICE_LABELS[zone] ?? zone,
    officerName: narrativeRow?.officer_name ?? '',
    weekEnding,
    weekRange: { from, to },
    categories,
    totals,
    narrative: narrativeRow ?? null,
    thematic,
  }
}
