import { z } from 'zod'
import type { ActivityType } from '@/types/database.types'

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

export const activitySchema = z.object({
  // Zod v4: error params use 'error' instead of 'required_error'
  activity_type: z.enum(activityTypes, 'Activity type is required'),
  date: z.string().min(1, 'Date is required'),
  company_name: z.string().min(1, 'Company name is required').max(200),
  location: z.string().min(1, 'Location is required').max(200),
  telephone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  sector: z.string().optional(),
  detail: z.string().optional(),
  action_required: z.string().optional(),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled'] as const)
    .default('pending'),
})

export type ActivityFormData = z.infer<typeof activitySchema>
export type ActivityFormInput = z.input<typeof activitySchema>
