'use server'

import { createClient } from '@/lib/supabase/server'
import { webinarSchema } from '@/lib/validations/webinar.schema'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function createWebinar(formData: unknown) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = webinarSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { data, error } = await supabase
    .from('webinars')
    .insert({
      country: parsed.data.country,
      country_code: parsed.data.country_code || null,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/module-b/webinars')
  return { success: true, id: data.id }
}

export async function completeWebinarTask(taskId: string, notes?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('webinar_tasks')
    .update({
      status: 'completed',
      completed_by: user.id,
      notes: notes ?? null,
    })
    .eq('id', taskId)
    .eq('status', 'in_progress')

  if (error) return { error: error.message }

  revalidatePath('/module-b/webinars')
  return { success: true }
}

export async function updateWebinarTaskNotes(taskId: string, notes: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('webinar_tasks')
    .update({ notes })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/module-b/webinars')
  return { success: true }
}

export async function updateTaskDeadline(taskId: string, deadline: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'regional_admin') return { error: 'Permission denied' }

  const parsed = z.string().min(1).safeParse(deadline)
  if (!parsed.success) return { error: 'Invalid date' }
  const newDeadline = new Date(deadline)
  if (isNaN(newDeadline.getTime())) return { error: 'Invalid date' }

  const { data: task } = await supabase
    .from('webinar_tasks')
    .select('status')
    .eq('id', taskId)
    .single()
  if (!task) return { error: 'Task not found' }
  if (task.status === 'completed') return { error: 'Cannot edit a completed task' }

  const isNowOnTime = newDeadline > new Date()
  const { error } = await supabase
    .from('webinar_tasks')
    .update({
      deadline: newDeadline.toISOString(),
      ...(isNowOnTime && task.status === 'in_progress' ? { is_delayed: false, status: 'in_progress' } : {}),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }
  revalidatePath('/module-b/webinars')
  return { success: true }
}

export async function deleteWebinar(id: string) {
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

  if (profile?.role !== 'regional_admin') {
    return { error: 'Only administrators can delete webinars' }
  }

  const { error } = await supabase
    .from('webinars')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/module-b/webinars')
  return { success: true }
}
