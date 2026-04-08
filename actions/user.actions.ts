'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ZonalOffice, UserRole } from '@/types/database.types'

const inviteUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  email: z.string().email('Invalid email address'),
  role: z.enum(['zonal_officer', 'regional_admin', 'viewer']),
  zonal_office: z
    .enum(['kumasi', 'tamale', 'takoradi', 'techiman', 'ho', 'koforidua'])
    .nullable()
    .optional(),
})

export async function inviteUser(data: unknown) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'regional_admin') {
    return { error: 'Permission denied' }
  }

  const parsed = inviteUserSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const admin = createAdminClient()

  // Check if a profile with this email already exists
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle()

  if (existing) {
    return { error: 'A user with this email address already exists.' }
  }

  // Invite the user — Supabase sends a setup email with a magic link
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        full_name: parsed.data.full_name,
      },
    }
  )

  if (inviteError) return { error: inviteError.message }

  // Insert the profile row immediately so the user is visible in the table
  const { error: profileError } = await admin.from('profiles').insert({
    id: invited.user.id,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    role: parsed.data.role as UserRole,
    zonal_office: (parsed.data.zonal_office ?? null) as ZonalOffice | null,
    is_active: true,
  })

  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/users')
  return { success: true }
}

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  zonal_office: z
    .enum(['kumasi', 'tamale', 'takoradi', 'techiman', 'ho', 'koforidua'])
    .nullable()
    .optional(),
  role: z.enum(['zonal_officer', 'regional_admin', 'viewer']).optional(),
  is_active: z.boolean().optional(),
})

export async function updateUserProfile(userId: string, data: unknown) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Check if caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'regional_admin') {
    return { error: 'Permission denied' }
  }

  const parsed = updateProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const updateData: {
    full_name?: string
    zonal_office?: ZonalOffice | null
    role?: UserRole
    is_active?: boolean
  } = {}

  if (parsed.data.full_name) updateData.full_name = parsed.data.full_name
  if (parsed.data.zonal_office !== undefined)
    updateData.zonal_office = parsed.data.zonal_office as ZonalOffice | null
  if (parsed.data.role) updateData.role = parsed.data.role as UserRole
  if (parsed.data.is_active !== undefined)
    updateData.is_active = parsed.data.is_active

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function getCurrentProfile() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function updateOwnDisplayName(fullName: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = z.string().min(1, 'Name is required').max(200).safeParse(fullName)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

export async function changeOwnPassword(newPassword: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .safeParse(newPassword)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { error } = await supabase.auth.updateUser({ password: parsed.data })
  if (error) return { error: error.message }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
