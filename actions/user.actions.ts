'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ZonalOffice, UserRole } from '@/types/database.types'

const zonalOffices = ['accra', 'kumasi', 'tamale', 'takoradi', 'techiman', 'ho', 'koforidua'] as const
const productionAppUrl = 'https://roat.netlify.app'

// Shared default password assigned to every invited user so they can sign in
// immediately even if the invite email never arrives. They are still routed to
// the Set-Password screen on first login (profiles.onboarding_completed_at is NULL).
const DEFAULT_INVITE_PASSWORD = 'roat@1234'

function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL || productionAppUrl

  if (process.env.NODE_ENV === 'production' && configuredUrl.includes('localhost')) {
    return productionAppUrl
  }

  return configuredUrl.replace(/\/$/, '')
}

const inviteUserSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  email: z.string().email('Invalid email address'),
  role: z.enum(['zonal_officer', 'regional_admin', 'viewer']),
  zonal_office: z
    .enum(zonalOffices)
    .nullable()
    .optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'zonal_officer' && !data.zonal_office) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Zonal office is required for Zonal Officers',
      path: ['zonal_office'],
    })
  }
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
      redirectTo: `${getAppUrl()}/auth/callback?next=/setup-password`,
    }
  )

  if (inviteError) return { error: inviteError.message }

  // Set the shared default password and confirm the email so the user can log
  // in with DEFAULT_INVITE_PASSWORD right away (the invite email link still
  // works for setting their own password if it arrives).
  const { error: passwordError } = await admin.auth.admin.updateUserById(invited.user.id, {
    password: DEFAULT_INVITE_PASSWORD,
    email_confirm: true,
  })
  if (passwordError) return { error: passwordError.message }

  const zonalOffice = parsed.data.role === 'zonal_officer'
    ? parsed.data.zonal_office!
    : null

  // Upsert because the auth.users trigger may create the profile first.
  const { error: profileError } = await admin.from('profiles').upsert({
    id: invited.user.id,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    role: parsed.data.role as UserRole,
    zonal_office: zonalOffice as ZonalOffice | null,
    is_active: true,
  }, {
    onConflict: 'id',
  })

  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/users')
  return { success: true }
}

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  zonal_office: z
    .enum(zonalOffices)
    .nullable()
    .optional(),
  role: z.enum(['zonal_officer', 'regional_admin', 'viewer']).optional(),
  is_active: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'zonal_officer' && !data.zonal_office) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Zonal office is required for Zonal Officers',
      path: ['zonal_office'],
    })
  }
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
  if (parsed.data.zonal_office !== undefined || parsed.data.role)
    updateData.zonal_office = parsed.data.role && parsed.data.role !== 'zonal_officer'
      ? null
      : parsed.data.zonal_office as ZonalOffice | null
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
  if (!parsed.success) return { error: parsed.error.issues[0].message }

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
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { error } = await supabase.auth.updateUser({ password: parsed.data })
  if (error) return { error: error.message }

  return { success: true }
}

export async function completeOnboardingPassword(newPassword: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .safeParse(newPassword)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) return { error: 'This account is inactive. Contact your administrator.' }

  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data })
  if (passwordError) return { error: passwordError.message }

  const admin = createAdminClient()
  const { error: profileError } = await admin
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  revalidatePath('/dashboard')
  revalidatePath('/profile')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
