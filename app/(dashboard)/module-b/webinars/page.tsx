import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WebinarPipeline } from '@/components/module-b/WebinarPipeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WebinarWithTasks } from '@/types/webinar.types'

export const metadata = { title: 'Webinar Pipeline — ROAT' }

export default async function WebinarsPage() {
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

  const { data: webinarsRaw } = await supabase
    .from('webinars')
    .select('*, webinar_tasks(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typed = ((webinarsRaw ?? []) as any[]) as WebinarWithTasks[]
  const active = typed.filter(w => {
    const tasks = w.webinar_tasks ?? []
    return tasks.some(t => t.status !== 'completed')
  })
  const completed = typed.filter(w => {
    const tasks = w.webinar_tasks ?? []
    return tasks.length > 0 && tasks.every(t => t.status === 'completed')
  })
  const delayed = typed.filter(w =>
    w.webinar_tasks?.some(t => t.is_delayed || (t.status === 'in_progress' && t.deadline && new Date() > new Date(t.deadline)))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Webinar Pipeline</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tracking {typed.length} countr{typed.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        {profile?.role !== 'viewer' && (
          <Button asChild className="gap-2 bg-slate-900 hover:bg-slate-800 text-sm font-medium">
            <Link href="/module-b/new">
              <Plus className="h-4 w-4" />
              Add Country
            </Link>
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold text-slate-900">{active.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-3xl font-semibold text-emerald-600">{completed.length}</p>
          </CardContent>
        </Card>
        <Card className={`border-slate-100 shadow-sm ${delayed.length > 0 ? 'border-red-100 bg-red-50/30' : ''}`}>
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400 flex items-center gap-2">
              {delayed.length > 0 && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
              Delayed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className={`text-3xl font-semibold ${delayed.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {delayed.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {delayed.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Attention Required</p>
            <p className="text-sm text-red-600 mt-0.5">
              {delayed.length} countr{delayed.length !== 1 ? 'ies have' : 'y has'} delayed task{delayed.length !== 1 ? 's' : ''} that require immediate action.
            </p>
          </div>
        </div>
      )}

      <WebinarPipeline webinars={typed} />
    </div>
  )
}
