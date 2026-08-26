import type { Step } from 'react-joyride'
import type { UserRole, ZonalOffice } from '@/types/database.types'

export const TOUR_IDS = [
  'dashboard',
  'activities',
  'activity-create',
  'activity-edit',
  'reports',
  'accra-reports',
  'weekly-report',
  'webinars',
  'webinar-create',
  'webinar-detail',
  'admin-users',
  'admin-targets',
  'admin-performance',
  'admin-settings',
  'profile',
] as const

export type TourId = (typeof TOUR_IDS)[number]
export type TourOutcome = 'completed' | 'skipped'

export interface TourProgress {
  tour_id: TourId
  tour_version: number
  outcome: TourOutcome
  seen_at: string
}

export interface TourContext {
  role: UserRole
  zonalOffice: ZonalOffice | null
  isMobile: boolean
}

export interface TourDefinition {
  id: TourId
  version: number
  match: (pathname: string) => boolean
  steps: (context: TourContext) => Step[]
}

export function isTourId(value: string): value is TourId {
  return (TOUR_IDS as readonly string[]).includes(value)
}
