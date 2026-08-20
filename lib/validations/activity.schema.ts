import { z } from 'zod'
import type { ActivityType, ZonalOffice } from '@/types/database.types'
import {
  ACCRA_OTHER_ACTIVITY_TYPE,
  CHECK_UP_CALL_OUTCOMES,
  REGIONAL_ACTIVITY_TYPES,
  SELECTABLE_ACTIVITY_TYPES,
} from '@/types/activity.types'

export const zonalOffices: [ZonalOffice, ...ZonalOffice[]] = [
  'accra',
  'kumasi',
  'tamale',
  'takoradi',
  'techiman',
  'ho',
  'koforidua',
]

export const regionalZonalOffices = zonalOffices.filter(
  office => office !== 'accra'
) as Exclude<ZonalOffice, 'accra'>[]

export const activityTypes: [ActivityType, ...ActivityType[]] = [
  ...SELECTABLE_ACTIVITY_TYPES,
]

export const regionalActivityTypes = [...REGIONAL_ACTIVITY_TYPES]

const PHONE_ERROR_MESSAGE = 'Enter valid phone number(s), e.g. 024 123 4567 or 0200710055/0508288446'

function isValidSinglePhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '')

  return /^0\d{9}$/.test(compact) || /^\+\d{8,15}$/.test(compact)
}

function isValidPhone(value: string) {
  const trimmed = value.trim()
  if (trimmed.length === 0) return true

  const phoneNumbers = trimmed.split(/[\/,]/).map(phone => phone.trim())
  if (phoneNumbers.some(phone => phone.length === 0)) return false

  return phoneNumbers.every(isValidSinglePhone)
}

const activityBaseSchema = z.object({
  // Only supplied by regional admins (officers inherit their own zone server-side)
  zonal_office: z.enum(zonalOffices).optional(),
  date: z.string().min(1, 'Date is required'),
  company_name: z.string().min(1, 'Company name is required').max(200),
  location: z.string().min(1, 'Location is required').max(200),
  telephone: z
    .string()
    .trim()
    .min(1, 'Company telephone number is required')
    .refine(isValidPhone, PHONE_ERROR_MESSAGE),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  sector: z.string().optional(),
  detail: z.string().optional(),
  action_required: z.string().optional(),
  call_outcome: z.enum(CHECK_UP_CALL_OUTCOMES).optional(),
  custom_activity_description: z.string().optional(),
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

export const activitySchema = activityBaseSchema
  .extend({
    // Zod v4: error params use 'error' instead of 'required_error'
    activity_type: z.enum(activityTypes, 'Activity type is required'),
  })
  .superRefine((data, context) => {
    if (
      data.activity_type === ACCRA_OTHER_ACTIVITY_TYPE &&
      !data.custom_activity_description?.trim()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['custom_activity_description'],
        message: 'Enter a description for Other',
      })
    }
    if (data.activity_type === 'checkup_call' && !data.call_outcome) {
      context.addIssue({
        code: 'custom',
        path: ['call_outcome'],
        message: 'Select the result of the check-up call',
      })
    }
  })

export const createActivitySchema = activityBaseSchema
  .extend({
    activity_types: z
      .array(z.enum(activityTypes))
      .min(1, 'Select at least one activity type'),
  })
  .superRefine((data, context) => {
    if (
      data.activity_types.includes(ACCRA_OTHER_ACTIVITY_TYPE) &&
      !data.custom_activity_description?.trim()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['custom_activity_description'],
        message: 'Enter a description for Other',
      })
    }
    if (data.activity_types.includes('checkup_call') && !data.call_outcome) {
      context.addIssue({
        code: 'custom',
        path: ['call_outcome'],
        message: 'Select the result of the check-up call',
      })
    }
  })

export type ActivityFormData = z.infer<typeof activitySchema>
export type ActivityFormInput = z.input<typeof activitySchema>
export type CreateActivityFormData = z.infer<typeof createActivitySchema>
