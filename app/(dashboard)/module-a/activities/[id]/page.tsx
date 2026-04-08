import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ActivityForm } from '@/components/module-a/ActivityForm'
import type { Activity } from '@/types/activity.types'

export const metadata = { title: 'Edit Activity — ROAT' }

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'viewer') redirect('/module-a/activities')

  const isAdmin = profile?.role === 'regional_admin'

  const { data: activity } = await supabase
    .from('activities')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!activity) notFound()

  if (activity.status === 'completed' && !isAdmin) {
    redirect('/module-a/activities')
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/module-a/activities"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Activities
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Edit Activity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update the details of this activity record.
        </p>
      </div>
      <ActivityForm activity={activity as Activity} isAdmin={isAdmin} />
    </div>
  )
}
