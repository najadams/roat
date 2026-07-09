import { z } from 'zod'
import type { ActivityType, ZonalOffice } from '@/types/database.types'

export const zonalOffices: [ZonalOffice, ...ZonalOffice[]] = [
  'accra',
  'kumasi',
  'tamale',
  'takoradi',
  'techiman',
  'ho',
  'koforidua',
]

export const activityTypes: [ActivityType, ...ActivityType[]] = [
  'investor_enquiry',
  'new_registration',
  'renewal',
  'investor_issue_resolution',
  'facilitation_done',
  'site_visit',
  'technology_transfer_agreement',
  'stakeholder_engagement',
  'official_correspondence',
  'outreach_promotional',
  'media_interview',
  'checkup_call',
  'iomp_update',
]

const activityBaseSchema = z.object({
  // Only supplied by regional admins (officers inherit their own zone server-side)
  zonal_office: z.enum(zonalOffices).optional(),
  date: z.string().min(1, 'Date is required'),
  company_name: z.string().min(1, 'Company name is required').max(200),
  location: z.string().min(1, 'Location is required').max(200),
  telephone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  sector: z.string().optional(),
  detail: z.string().optional(),
  action_required: z.string().optional(),
  outcome: z.string().optional(),
  // Investment outcomes (optional) — power the impact reporting
  investment_amount: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number('Must be a number').nonnegative('Must be 0 or more').optional()
  ),
  investment_currency: z.string().optional(),
  jobs_created: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number('Must be a number').int('Must be a whole number').nonnegative('Must be 0 or more').optional()
  ),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'] as const)
    .default('pending'),
})

export const activitySchema = activityBaseSchema.extend({
  // Zod v4: error params use 'error' instead of 'required_error'
  activity_type: z.enum(activityTypes, 'Activity type is required'),
})

export const createActivitySchema = activityBaseSchema.extend({
  activity_types: z
    .array(z.enum(activityTypes))
    .min(1, 'Select at least one activity type'),
})

export type ActivityFormData = z.infer<typeof activitySchema>
export type ActivityFormInput = z.input<typeof activitySchema>
export type CreateActivityFormData = z.infer<typeof createActivitySchema>
