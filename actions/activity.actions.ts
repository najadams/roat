'use server'

import { createClient } from '@/lib/supabase/server'
import { activitySchema } from '@/lib/validations/activity.schema'
import { revalidatePath } from 'next/cache'

export async function createActivity(formData: unknown) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('zonal_office, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const parsed = activitySchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Admins choose the zone on the form; officers always use their assigned zone.
  const { zonal_office: formZone, ...rest } = parsed.data
  const isAdmin = profile.role === 'regional_admin'
  const zone = isAdmin ? formZone : profile.zonal_office

  if (!zone) {
    return {
      error: isAdmin
        ? 'Please select a zonal office'
        : 'No zonal office assigned to your account',
    }
  }

  const { error } = await supabase.from('activities').insert({
    ...rest,
    zonal_office: zone,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/module-a/activities')
  return { success: true }
}

export async function updateActivity(id: string, formData: unknown) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'regional_admin'

  const { data: current } = await supabase
    .from('activities')
    .select('status, activity_type, date')
    .eq('id', id)
    .single()
  if (!current) return { error: 'Activity not found' }

  if (current.status === 'completed' && !isAdmin) {
    return { error: 'This activity has been completed and cannot be modified.' }
  }

  const parsed = activitySchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { zonal_office: formZone, ...rest } = parsed.data
  const updatePayload = isAdmin
    ? { ...rest, ...(formZone ? { zonal_office: formZone } : {}), updated_by: user.id }
    : {
        ...rest,
        activity_type: current.activity_type,
        date: current.date,
        updated_by: user.id,
      }

  const { error } = await supabase
    .from('activities')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/module-a/activities')
  revalidatePath(`/module-a/activities/${id}`)
  return { success: true }
}

export async function deleteActivity(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('activities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/module-a/activities')
  return { success: true }
}
