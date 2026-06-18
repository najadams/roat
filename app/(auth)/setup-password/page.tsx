import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SetupPasswordForm } from './setup-password-form'

export default async function SetupPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, onboarding_completed_at')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) redirect('/account-disabled')
  if (profile.onboarding_completed_at) redirect('/dashboard')

  return <SetupPasswordForm />
}
