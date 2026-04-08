import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { WebinarForm } from '@/components/module-b/WebinarForm'

export const metadata = { title: 'Add Webinar — ROAT' }

export default async function NewWebinarPage() {
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

  if (profile?.role === 'viewer') {
    redirect('/module-b/webinars')
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/module-b/webinars"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pipeline
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Add Country Webinar</h1>
        <p className="mt-1 text-sm text-slate-500">
          Begin tracking a new country through the 6-step webinar workflow.
        </p>
      </div>
      <WebinarForm />
    </div>
  )
}
