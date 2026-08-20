'use server'

import { createClient } from '@/lib/supabase/server'
import { activitySchema, createActivitySchema } from '@/lib/validations/activity.schema'
import {
  ACCRA_OTHER_ACTIVITY_TYPE,
  isAccraActivityType,
  isRegionalActivityType,
} from '@/types/activity.types'
import { revalidatePath } from 'next/cache'

const ACCRA_DEFAULT_COMPANY = 'Accra Operations'
const ACCRA_DEFAULT_LOCATION = 'Accra'
const todayString = () => new Date().toISOString().slice(0, 10)

function withAccraCoreDefaults(formData: unknown, isAccraActivity: boolean) {
  if (!isAccraActivity || !formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return formData
  }

  return {
    ...formData,
    date: 'date' in formData && formData.date ? formData.date : todayString(),
    company_name: 'company_name' in formData && formData.company_name
      ? formData.company_name
      : ACCRA_DEFAULT_COMPANY,
    location: 'location' in formData && formData.location ? formData.location : ACCRA_DEFAULT_LOCATION,
    telephone: 'telephone' in formData ? formData.telephone : '',
    email: 'email' in formData ? formData.email : '',
    sector: 'sector' in formData ? formData.sector : '',
    investment_amount: undefined,
    investment_currency: '',
    jobs_created: undefined,
    detail: 'detail' in formData ? formData.detail : '',
    action_required: 'action_required' in formData ? formData.action_required : '',
    outcome: 'outcome' in formData ? formData.outcome : '',
  }
}

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

  const intendedZone = profile.role === 'regional_admin' &&
    formData &&
    typeof formData === 'object' &&
    !Array.isArray(formData) &&
    'zonal_office' in formData
    ? formData.zonal_office
    : profile.zonal_office
  const normalizedFormData = withAccraCoreDefaults(formData, intendedZone === 'accra')
  const parsed = createActivitySchema.safeParse(normalizedFormData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // Admins choose the zone on the form; officers always use their assigned zone.
  const {
    zonal_office: formZone,
    activity_types: activityTypes,
    custom_activity_description: customActivityDescription,
    ...rest
  } = parsed.data
  const isAdmin = profile.role === 'regional_admin'
  const zone = isAdmin ? formZone : profile.zonal_office

  if (!zone) {
    return {
      error: isAdmin
        ? 'Please select a zonal office'
        : 'No zonal office assigned to your account',
    }
  }

  const isAccraActivity = zone === 'accra'
  const trimmedCustomDescription = customActivityDescription?.trim() ?? ''
  const uniqueActivityTypes = Array.from(new Set(activityTypes))

  if (isAccraActivity) {
    if (uniqueActivityTypes.length !== 1 || !isAccraActivityType(uniqueActivityTypes[0])) {
      return {
        error: {
          activity_type: ['Select one of the available Accra activity types'],
        },
      }
    }

    const activityType = uniqueActivityTypes[0]

    if (activityType === ACCRA_OTHER_ACTIVITY_TYPE && !trimmedCustomDescription) {
      return {
        error: {
          custom_activity_description: ['Enter a description for Other'],
        },
      }
    }

    const { data: inserted, error } = await supabase
      .from('activities')
      .insert({
        ...rest,
        activity_type: activityType,
        call_outcome: activityType === 'checkup_call' ? rest.call_outcome ?? null : null,
        zonal_office: zone,
        investment_amount: null,
        investment_currency: null,
        jobs_created: null,
        detail: trimmedCustomDescription || null,
        action_required: null,
        outcome: null,
        created_by: user.id,
      })
      .select('id')

    if (error) return { error: error.message }

    const ids = inserted?.map(row => row.id) ?? []
    if (ids.length === 0) return { error: 'No activities were created' }

    revalidatePath('/module-a/activities')
    revalidatePath('/module-a/accra-reports')
    return { success: true, ids, id: ids[0] }
  }

  if (uniqueActivityTypes.length === 0) {
    return { error: { activity_type: ['Select at least one activity type'] } }
  }
  if (uniqueActivityTypes.some(activityType => !isRegionalActivityType(activityType))) {
    return { error: { activity_type: ['Select only activity types available for regional offices'] } }
  }

  const { data: inserted, error } = await supabase
    .from('activities')
    .insert(
      uniqueActivityTypes.map(activityType => ({
        ...rest,
        activity_type: activityType,
        call_outcome: activityType === 'checkup_call' ? rest.call_outcome ?? null : null,
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
    .select('status, activity_type, date, zonal_office')
    .eq('id', id)
    .single()
  if (!current) return { error: 'Activity not found' }

  if (current.status === 'completed' && !isAdmin) {
    return { error: 'This activity has been completed and cannot be modified.' }
  }

  const intendedZone = isAdmin &&
    formData &&
    typeof formData === 'object' &&
    !Array.isArray(formData) &&
    'zonal_office' in formData &&
    formData.zonal_office
    ? formData.zonal_office
    : current.zonal_office
  const normalizedFormData = withAccraCoreDefaults(formData, intendedZone === 'accra')
  const parsed = activitySchema.safeParse(normalizedFormData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { zonal_office: formZone, custom_activity_description: customActivityDescription, ...rest } = parsed.data
  const nextZone = isAdmin && formZone ? formZone : current.zonal_office
  const isAccraActivity = nextZone === 'accra'
  const trimmedCustomDescription = customActivityDescription?.trim() ?? ''
  const nextActivityType = isAdmin ? rest.activity_type : current.activity_type

  if (isAccraActivity) {
    if (!isAccraActivityType(nextActivityType)) {
      return { error: { activity_type: ['Select one of the available Accra activity types'] } }
    }
    if (nextActivityType === ACCRA_OTHER_ACTIVITY_TYPE && !trimmedCustomDescription) {
      return { error: { custom_activity_description: ['Enter a description for Other'] } }
    }
  } else if (!isRegionalActivityType(nextActivityType)) {
    return { error: { activity_type: ['Select an activity type available for regional offices'] } }
  }

  const updatePayload = isAdmin
    ? {
        ...rest,
        activity_type: nextActivityType,
        call_outcome: nextActivityType === 'checkup_call' ? rest.call_outcome ?? null : null,
        ...(formZone ? { zonal_office: formZone } : {}),
        ...(isAccraActivity
          ? {
              investment_amount: null,
              investment_currency: null,
              jobs_created: null,
              detail: trimmedCustomDescription || null,
              action_required: null,
              outcome: null,
            }
          : {}),
        updated_by: user.id,
      }
    : {
        ...rest,
        activity_type: current.activity_type,
        call_outcome: current.activity_type === 'checkup_call' ? rest.call_outcome ?? null : null,
        date: current.date,
        ...(isAccraActivity
          ? {
              investment_amount: null,
              investment_currency: null,
              jobs_created: null,
              detail: trimmedCustomDescription || null,
              action_required: null,
              outcome: null,
            }
          : {}),
        updated_by: user.id,
      }

  const { error } = await supabase
    .from('activities')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/module-a/activities')
  revalidatePath('/module-a/accra-reports')
  revalidatePath('/dashboard')
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
