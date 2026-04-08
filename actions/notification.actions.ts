'use server'

import { createClient } from '@/lib/supabase/server'

export type PendingAlert = {
  id: string
  activity_type: string
  company_name: string
  location: string
  date: string
  zonal_office: string
  created_at: string
}

export async function getStalePendingAlerts(): Promise<PendingAlert[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'viewer') return []

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('activities')
    .select('id, activity_type, company_name, location, date, zonal_office, created_at')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .is('pending_alert_sent_at', null)
    .lt('created_at', twoDaysAgo)
    .order('created_at', { ascending: true })

  if (profile.role === 'zonal_officer' && profile.zonal_office) {
    query = query.eq('zonal_office', profile.zonal_office)
  }

  const { data } = await query
  return (data ?? []) as PendingAlert[]
}

export async function dismissActivityAlert(activityId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('activities')
    .update({ pending_alert_sent_at: new Date().toISOString() })
    .eq('id', activityId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function dismissAllActivityAlerts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'viewer') return { error: 'Unauthorized' }

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('activities')
    .update({ pending_alert_sent_at: new Date().toISOString() })
    .eq('status', 'pending')
    .is('deleted_at', null)
    .is('pending_alert_sent_at', null)
    .lt('created_at', twoDaysAgo)

  if (profile.role === 'zonal_officer' && profile.zonal_office) {
    query = query.eq('zonal_office', profile.zonal_office)
  }

  const { error } = await query
  if (error) return { error: error.message }
  return { success: true }
}
