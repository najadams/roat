import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ActivityForm } from '@/components/module-a/ActivityForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Log Activity — ROAT' }

export default async function NewActivityPage() {
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

  if (profile?.role === 'viewer') {
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
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Log New Activity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record a new zonal activity for your office.
        </p>
      </div>
      <ActivityForm />
    </div>
  )
}
