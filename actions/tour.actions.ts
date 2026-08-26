'use server'

import { createClient } from '@/lib/supabase/server'
import { getTourById } from '@/lib/tours/registry'
import { isTourId, type TourOutcome, type TourProgress } from '@/lib/tours/types'

export async function recordTourOutcome(tourId: string, outcome: TourOutcome) {
  if (!isTourId(tourId)) return { error: 'Unknown tutorial.' }
  if (outcome !== 'completed' && outcome !== 'skipped') {
    return { error: 'Invalid tutorial outcome.' }
  }

  const definition = getTourById(tourId)
  if (!definition) return { error: 'Unknown tutorial.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const seenAt = new Date().toISOString()
  const progress: TourProgress = {
    tour_id: tourId,
    tour_version: definition.version,
    outcome,
    seen_at: seenAt,
  }

  const { error } = await supabase
    .from('user_tour_progress')
    .upsert(
      {
        user_id: user.id,
        ...progress,
      },
      { onConflict: 'user_id,tour_id' }
    )

  if (error) return { error: error.message }
  return { success: true, progress }
}
