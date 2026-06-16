import { z } from 'zod'
import { zonalOffices } from '@/lib/validations/activity.schema'

export const weeklyReportSchema = z.object({
  zonal_office: z.enum(zonalOffices),
  week_ending: z.string().min(1, 'Week-ending date is required'),
  key_highlights: z.string().optional(),
  challenges: z.string().optional(),
  narrative_summary: z.string().optional(),
})

export type WeeklyReportFormData = z.infer<typeof weeklyReportSchema>
