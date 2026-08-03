import type { ActivityType, ZonalOffice } from '@/types/database.types'

/**
 * Section B — Weekly summary categories.
 * Maps the report's grouped categories to Argus activity types. Each activity
 * type belongs to exactly one category to avoid double-counting. Adjust here if
 * the office's grouping conventions change.
 */
export interface WeeklyReportCategory {
  key: string
  label: string
  types: ActivityType[]
}

export const WEEKLY_REPORT_CATEGORIES: WeeklyReportCategory[] = [
  { key: 'new_registrations',   label: 'New Investor Registrations',          types: ['new_registration'] },
  { key: 'facilitation',        label: 'Facilitation (renewal)',              types: ['renewal'] },
  { key: 'stakeholder',         label: 'Stakeholder Engagements',             types: ['stakeholder_engagement'] },
  { key: 'monitoring_tta',      label: 'Monitoring, Outreach & TTAs',         types: ['outreach_promotional', 'technology_transfer_agreement'] },
  { key: 'iomp',                label: 'IOMP Data Updates',                   types: ['iomp_update'] },
  { key: 'investor_issues',     label: 'Investor Issues Facilitated',         types: ['investor_issue_resolution'] },
  { key: 'checkup_calls',       label: 'Check-up Calls',                      types: ['checkup_call'] },
]

/**
 * Section D — Detailed activity tracker thematic areas.
 * Some areas have no backing activity type (profiling / office admin) and are
 * populated from the narrative or left blank.
 */
export interface ThematicArea {
  key: string
  label: string
  types: ActivityType[]
}

export const THEMATIC_AREAS: ThematicArea[] = [
  { key: 'facilitation_registration', label: 'Investor Facilitation & Registration', types: ['new_registration', 'renewal', 'investor_enquiry'] },
  { key: 'aftercare_monitoring',      label: 'Investor Issue Facilitation & Monitoring', types: ['investor_issue_resolution', 'outreach_promotional'] },
  { key: 'investment_promotion',      label: 'Investment Promotion & Local Investment Drive', types: [] },
  { key: 'stakeholder_engagement',    label: 'Regional Stakeholder Engagement',      types: ['stakeholder_engagement'] },
  { key: 'iomp_support',              label: 'IOMP Support & Updates',               types: ['iomp_update'] },
  { key: 'quota_tta',                 label: 'Quota / TTA & Check-up',               types: ['technology_transfer_agreement', 'checkup_call'] },
  { key: 'media_publicity',           label: 'Media & Publicity Contributions',      types: ['media_interview'] },
]

export interface WeeklyReportNarrative {
  id?: string
  zonal_office: ZonalOffice
  week_ending: string
  officer_name: string | null
  key_highlights: string | null
  challenges: string | null
  narrative_summary: string | null
}

export interface WeeklyCategoryRow {
  key: string
  label: string
  target: number | null
  targetExplicit: boolean
  achieved: number
  variance: number | null
  comments: string
}

export interface WeeklyThematicRow {
  key: string
  label: string
  activityDescriptions: string
  dates: string
  partners: string
  outcomes: string
  evidence: string
  comments: string
}

export interface WeeklyReportData {
  zonalOffice: ZonalOffice
  zoneLabel: string
  officerName: string
  weekEnding: string
  weekRange: { from: string; to: string }
  categories: WeeklyCategoryRow[]
  totals: { target: number; achieved: number }
  narrative: WeeklyReportNarrative | null
  thematic: WeeklyThematicRow[]
}
