import type { ActivityType } from '@/types/database.types'

export const REGIONAL_ACTIVITY_TYPES = [
  'investor_enquiry',
  'new_registration',
  'renewal',
  'investor_issue_resolution',
  'technology_transfer_agreement',
  'stakeholder_engagement',
  'outreach_promotional',
  'media_interview',
  'checkup_call',
  'iomp_update',
] as const satisfies readonly ActivityType[]

export const ACCRA_ACTIVITY_TYPES = [
  'accra_webinars_with_mission',
  'accra_webinars_for_business_groups_chamber',
  'accra_capacity_building_for_missions',
  'accra_engagements_events',
  'accra_mission_support',
  'checkup_call',
  'accra_capacity_building_for_regional_offices',
  'accra_orientation_for_regional_offices',
  'accra_other',
] as const satisfies readonly ActivityType[]

export const SELECTABLE_ACTIVITY_TYPES = [
  ...REGIONAL_ACTIVITY_TYPES,
  'accra_webinars_with_mission',
  'accra_webinars_for_business_groups_chamber',
  'accra_capacity_building_for_missions',
  'accra_engagements_events',
  'accra_mission_support',
  'accra_capacity_building_for_regional_offices',
  'accra_orientation_for_regional_offices',
  'accra_other',
] as const satisfies readonly ActivityType[]

export const REGIONAL_ACTIVITY_TYPE_LABELS: Record<string, string> = {
  investor_enquiry:               'Investor Enquiry',
  new_registration:               'New Registration',
  renewal:                        'Renewal',
  investor_issue_resolution:      'Investor Issue Facilitation',
  technology_transfer_agreement:  'Quota / TTA',
  stakeholder_engagement:         'Stakeholder Engagement',
  outreach_promotional:           'Monitoring / Outreach / Site Visit',
  media_interview:                'Media Interview',
  checkup_call:                   'Check-Up Call',
  iomp_update:                    'IOMP Update',
}

export const ACCRA_ACTIVITY_TYPE_LABELS: Record<string, string> = {
  accra_webinars_with_mission:                    'Webinars Organized with Mission',
  accra_webinars_for_business_groups_chamber:     'Webinars Organized for Business Groups / Chamber',
  accra_capacity_building_for_missions:            'Capacity Building for Missions',
  accra_engagements_events:                        'Engagements / Events',
  accra_mission_support:                           'Mission Support — Enquiry / Promotional Materials',
  checkup_call:                                    'Check-Up Calls',
  accra_capacity_building_for_regional_offices:    'Capacity Building for Regional Offices',
  accra_orientation_for_regional_offices:          'Orientation for Regional Offices',
  accra_other:                                     'Other',
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  ...REGIONAL_ACTIVITY_TYPE_LABELS,
  ...ACCRA_ACTIVITY_TYPE_LABELS,
}

export const ACCRA_OTHER_ACTIVITY_TYPE = 'accra_other' as const

export function isAccraActivityType(value: string): value is (typeof ACCRA_ACTIVITY_TYPES)[number] {
  return ACCRA_ACTIVITY_TYPES.includes(value as (typeof ACCRA_ACTIVITY_TYPES)[number])
}

export function isRegionalActivityType(value: string): value is (typeof REGIONAL_ACTIVITY_TYPES)[number] {
  return REGIONAL_ACTIVITY_TYPES.includes(value as (typeof REGIONAL_ACTIVITY_TYPES)[number])
}

export function getActivityTypeDisplay(activityType: string, customDescription?: string | null) {
  const label = ACTIVITY_TYPE_LABELS[activityType] ?? activityType.replace(/_/g, ' ')
  const description = customDescription?.trim()

  return activityType === ACCRA_OTHER_ACTIVITY_TYPE && description
    ? `${label}: ${description}`
    : label
}

export const ZONAL_OFFICE_LABELS: Record<string, string> = {
  accra: 'Accra',
  kumasi: 'Kumasi',
  tamale: 'Tamale',
  takoradi: 'Takoradi',
  techiman: 'Techiman',
  ho: 'Ho',
  koforidua: 'Koforidua',
}

export const REGIONAL_OFFICE_LABELS: Record<string, string> =
  Object.fromEntries(
    Object.entries(ZONAL_OFFICE_LABELS).filter(([key]) => key !== 'accra')
  )

export const SPECIAL_OFFICE_LABELS: Record<string, string> = {
  accra: ZONAL_OFFICE_LABELS.accra,
}

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface Activity {
  id: string
  activity_type: string
  zonal_office: string
  date: string
  company_name: string
  location: string
  telephone: string | null
  email: string | null
  sector: string | null
  detail: string | null
  action_required: string | null
  status: string
  investment_amount: number | null
  investment_currency: string | null
  jobs_created: number | null
  outcome: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
