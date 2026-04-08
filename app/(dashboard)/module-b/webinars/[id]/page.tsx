import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskRow } from '@/components/module-b/TaskRow'
import { ProgressBadge } from '@/components/module-b/ProgressBadge'
import { formatDate, formatDatetime } from '@/lib/utils/date-helpers'
import type { WebinarTask } from '@/types/webinar.types'

export default async function WebinarDetailPage({
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

  const { data: webinarRaw } = await supabase
    .from('webinars')
    .select('*, webinar_tasks(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!webinarRaw) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webinar = webinarRaw as any

  const tasks = ((webinar.webinar_tasks ?? []) as WebinarTask[]).sort(
    (a, b) => a.task_order - b.task_order
  )

  const completed = tasks.filter(t => t.status === 'completed').length
  const pct = Math.round((completed / 9) * 100)
  const hasDelayed = tasks.some(
    t => t.is_delayed || (t.status === 'in_progress' && t.deadline && new Date() > new Date(t.deadline))
  )
  const canComplete = profile?.role !== 'viewer'
  const canEditDeadline = profile?.role === 'regional_admin'

  const flag =
    webinar.country_code
      ? webinar.country_code
          .toUpperCase()
          .split('')
          .map((c: string) => String.fromCodePoint(c.charCodeAt(0) + 127397))
          .join('')
      : null

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

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              {flag && <span className="text-3xl">{flag}</span>}
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                {webinar.country}
              </h1>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                {webinar.country_code ?? 'No code'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Started {formatDate(webinar.created_at)}
              </span>
            </div>
          </div>
          <ProgressBadge pct={pct} hasDelayed={hasDelayed} size="md" />
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">{completed} of 9 tasks completed</span>
          <span className="text-xs font-medium text-slate-700">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              hasDelayed ? 'bg-red-400' : pct === 100 ? 'bg-emerald-400' : 'bg-blue-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Notes */}
      {webinar.notes && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 leading-relaxed">{webinar.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Task pipeline */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Task Pipeline
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Task</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Started</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Deadline</th>
                <th className="text-left px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">Info</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => (
                <TaskRow key={task.id} task={task} canComplete={canComplete} canEditDeadline={canEditDeadline} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Task notes summary */}
      {tasks.some(t => t.notes) && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">Task Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.filter(t => t.notes).map(task => (
              <div key={task.id} className="border-l-2 border-slate-200 pl-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Task {task.task_order}
                </p>
                <p className="text-sm text-slate-700">{task.notes}</p>
                {task.completed_at && (
                  <p className="text-xs text-slate-400 mt-1">
                    Completed {formatDatetime(task.completed_at)}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
