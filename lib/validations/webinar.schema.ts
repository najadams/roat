import { z } from 'zod'

export const webinarSchema = z.object({
  country: z.string().min(1, 'Country is required').max(100),
  country_code: z
    .string()
    .length(2, 'Must be a 2-letter ISO country code')
    .toUpperCase()
    .optional()
    .or(z.literal('')),
  notes: z.string().optional(),
})

export type WebinarFormData = z.infer<typeof webinarSchema>

export const completeTaskSchema = z.object({
  task_id: z.string().uuid(),
  notes: z.string().optional(),
})

export type CompleteTaskData = z.infer<typeof completeTaskSchema>
