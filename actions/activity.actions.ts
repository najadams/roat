'use server'

import { createClient } from '@/lib/supabase/server'
import { activitySchema, createActivitySchema } from '@/lib/validations/activity.schema'
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

  const parsed = createActivitySchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Admins choose the zone on the form; officers always use their assigned zone.
  const { zonal_office: formZone, activity_types: activityTypes, ...rest } = parsed.data
  const isAdmin = profile.role === 'regional_admin'
  const zone = isAdmin ? formZone : profile.zonal_office

  if (!zone) {
    return {
      error: isAdmin
        ? 'Please select a zonal office'
        : 'No zonal office assigned to your account',
    }
  }

  const uniqueActivityTypes = Array.from(new Set(activityTypes))
  const { data: inserted, error } = await supabase
    .from('activities')
    .insert(
      uniqueActivityTypes.map(activityType => ({
        ...rest,
        activity_type: activityType,
        zonal_office: zone,
        created_by: user.id,
      }))
    )
    .select('id')

  if (error) return { error: error.message }

  const ids = inserted?.map(row => row.id) ?? []
  if (ids.length === 0) return { error: 'No activities were created' }

  revalidatePath('/module-a/activities')
  return { success: true, ids, id: ids[0] }
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

const EVIDENCE_BUCKET = 'evidence'

/**
 * Records evidence files (already uploaded to the `evidence` Storage bucket by
 * the client) against an activity.
 */
export async function addActivityAttachments(
  activityId: string,
  files: { path: string; name: string; mime: string }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (files.length === 0) return { success: true }

  const { error } = await supabase.from('activity_attachments').insert(
    files.map(f => ({
      activity_id: activityId,
      storage_path: f.path,
      file_name: f.name,
      mime_type: f.mime,
      uploaded_by: user.id,
    }))
  )

  if (error) return { error: error.message }
  revalidatePath(`/module-a/activities/${activityId}`)
  return { success: true }
}

/** Returns an activity's attachments with short-lived signed download URLs. */
export async function getActivityAttachments(activityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows } = await supabase
    .from('activity_attachments')
    .select('id, storage_path, file_name, mime_type')
    .eq('activity_id', activityId)
    .order('created_at', { ascending: true })

  const out: { id: string; name: string; url: string | null }[] = []
  for (const r of rows ?? []) {
    const { data: signed } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(r.storage_path, 60 * 60)
    out.push({ id: r.id, name: r.file_name ?? 'file', url: signed?.signedUrl ?? null })
  }
  return out
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
