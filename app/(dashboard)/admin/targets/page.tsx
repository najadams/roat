import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTargetsForPeriod } from '@/actions/target.actions'
import { TargetsForm } from './targets-form'

export const metadata = { title: 'Activity Targets — ROAT' }

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{
    zone?: string
    year?: string
    quarter?: string
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'regional_admin') redirect('/dashboard')

  const params = await searchParams
  const now = new Date()
  const zone = params.zone ?? 'kumasi'
  const year = parseInt(params.year ?? String(now.getFullYear()))
  const quarter = parseInt(params.quarter ?? String(Math.floor(now.getMonth() / 3) + 1))

  const existingTargets = await getTargetsForPeriod({
    zonal_office: zone,
    period_type: 'quarterly',
    period_year: year,
    period_value: quarter,
  })

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-2">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Activity Targets</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set quarterly performance targets per activity type for each zonal office.
          Weekly and monthly views track cumulative progress toward these targets.
        </p>
      </div>

      <TargetsForm
        key={`${zone}-${year}-${quarter}`}
        initialZone={zone}
        initialYear={year}
        initialQuarter={quarter}
        initialTargets={existingTargets}
      />
    </div>
  )
}
