import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'
import { isTourId, type TourProgress } from '@/lib/tours/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (!profile.is_active) redirect('/account-disabled')
  if (!profile.onboarding_completed_at) redirect('/setup-password')

  const { data: tourRows, error: tourProgressError } = await supabase
    .from('user_tour_progress')
    .select('tour_id, tour_version, outcome, seen_at')
    .eq('user_id', user.id)

  const tourProgress = (tourRows ?? []).filter(
    (row): row is TourProgress =>
      isTourId(row.tour_id) &&
      (row.outcome === 'completed' || row.outcome === 'skipped')
  )

  return (
    <DashboardShell
      profile={profile}
      initialTourProgress={tourProgress}
      tourProgressAvailable={!tourProgressError}
    >
      {children}
    </DashboardShell>
  )
}
