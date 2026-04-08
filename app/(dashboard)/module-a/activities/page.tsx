import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActivityTable } from '@/components/module-a/ActivityTable'
import { ActivityFilters } from '@/components/module-a/ActivityFilters'
import type { Activity } from '@/types/activity.types'
import type { ActivityType, ActivityStatus, ZonalOffice } from '@/types/database.types'

export const metadata = { title: 'Activities — ROAT' }

interface PageProps {
  searchParams: Promise<{
    type?: string
    zone?: string
    status?: string
    month?: string
  }>
}

export default async function ActivitiesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zonal_office')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('activities')
    .select('*')
    .is('deleted_at', null)
    .order('date', { ascending: false })

  if (params.type) query = query.eq('activity_type', params.type as ActivityType)
  if (params.status) query = query.eq('status', params.status as ActivityStatus)
  if (params.zone && profile?.role === 'regional_admin') {
    query = query.eq('zonal_office', params.zone as ZonalOffice)
  }
  if (params.month) {
    const [year, month] = params.month.split('-')
    const from = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const to = `${year}-${month}-${lastDay}`
    query = query.gte('date', from).lte('date', to)
  }

  const { data: activities } = await query

  const isAdmin = profile?.role === 'regional_admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Activities</h1>
          <p className="mt-1 text-sm text-slate-500">
            {activities?.length ?? 0} record{(activities?.length ?? 0) !== 1 ? 's' : ''} found
          </p>
        </div>
        {profile?.role !== 'viewer' && (
          <Button asChild className="gap-2 bg-slate-900 hover:bg-slate-800 text-sm font-medium">
            <Link href="/module-a/new">
              <Plus className="h-4 w-4" />
              Log Activity
            </Link>
          </Button>
        )}
      </div>

      <ActivityFilters showZoneFilter={isAdmin} />

      <ActivityTable
        activities={(activities ?? []) as Activity[]}
        showZone={isAdmin}
        canDelete={isAdmin}
      />
    </div>
  )
}
