'use client'

import Link from 'next/link'
import { TASK_LABELS, TASK_ORDER } from '@/types/webinar.types'
import type { WebinarWithTasks } from '@/types/webinar.types'
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-helpers'
import { cn } from '@/lib/utils/cn'

interface WebinarPipelineProps {
  webinars: WebinarWithTasks[]
}

const STATUS_STYLES = {
  completed:   { dot: 'bg-emerald-500 ring-2 ring-emerald-100', connector: 'bg-emerald-300' },
  in_progress: { dot: 'bg-blue-500 ring-2 ring-blue-100', connector: 'bg-slate-200' },
  delayed:     { dot: 'bg-red-500 ring-2 ring-red-100', connector: 'bg-slate-200' },
  not_started: { dot: 'bg-slate-200', connector: 'bg-slate-200' },
}

function PipelineStepper({ tasks }: { tasks: WebinarWithTasks['webinar_tasks'] }) {
  const taskByName = Object.fromEntries(tasks.map(t => [t.task_name, t]))

  return (
    <div className="flex items-center">
      {TASK_ORDER.map((taskName, i) => {
        const task = taskByName[taskName]
        const isOverdue = task?.status === 'in_progress' && task.deadline && new Date() > new Date(task.deadline)
        const status = isOverdue ? 'delayed' : (task?.status ?? 'not_started')
        const styles = STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.not_started
        const isLast = i === TASK_ORDER.length - 1

        return (
          <div key={taskName} className="flex items-center">
            {/* Step dot */}
            <div className="relative group flex flex-col items-center">
              <div
                className={cn(
                  'h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                  styles.dot
                )}
              >
                {status === 'completed' && (
                  <CheckCircle2 className="h-3 w-3 text-white" strokeWidth={3} />
                )}
                {(status === 'in_progress') && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
                {status === 'delayed' && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>

              {/* Step number */}
              <span className="text-[9px] text-slate-400 mt-0.5 font-medium leading-none">{i + 1}</span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block">
                <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg max-w-[160px] text-center leading-snug">
                  <span className="text-slate-400 text-[10px] block mb-0.5">Task {i + 1}</span>
                  {TASK_LABELS[taskName]}
                  {task?.deadline && status !== 'completed' && (
                    <span className={cn('block text-[10px] mt-0.5', status === 'delayed' ? 'text-red-300' : 'text-slate-400')}>
                      {status === 'delayed' ? '⚠ Overdue' : `Due ${new Date(task.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    </span>
                  )}
                </div>
                {/* Arrow */}
                <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1" />
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className={cn('h-0.5 w-4 flex-shrink-0 mx-0.5', styles.connector)} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function WebinarPipeline({ webinars }: WebinarPipelineProps) {
  if (webinars.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 border border-slate-100 rounded-xl">
        <Circle className="h-8 w-8 mx-auto mb-3 text-slate-200" />
        <p className="text-sm font-medium text-slate-500">No webinars tracked yet</p>
        <p className="text-xs text-slate-400 mt-1">Add a country to begin tracking the pipeline.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm">
      {/* Table header */}
      <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-6 items-center">
        <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Country</span>
        <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Task Pipeline</span>
        <span className="text-xs font-semibold tracking-widest uppercase text-slate-400 w-20 text-center">Progress</span>
        <span className="text-xs font-semibold tracking-widest uppercase text-slate-400 w-24 text-right">Actions</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-50">
        {webinars.map(webinar => {
          const tasks = webinar.webinar_tasks ?? []
          const completed = tasks.filter(t => t.status === 'completed').length
          const pct = Math.round((completed / 9) * 100)
          const hasDelayed = tasks.some(
            t => t.is_delayed || (t.status === 'in_progress' && t.deadline && new Date() > new Date(t.deadline))
          )

          return (
            <div
              key={webinar.id}
              className={cn(
                'px-5 py-4 grid grid-cols-[1fr_auto_auto_auto] gap-6 items-center hover:bg-slate-50/60 transition-colors',
                hasDelayed && 'bg-red-50/30 hover:bg-red-50/50'
              )}
            >
              {/* Country */}
              <div className="flex items-center gap-2.5 min-w-0">
                {webinar.country_code && (
                  <span className="text-xl flex-shrink-0" title={webinar.country}>
                    {webinar.country_code
                      .toUpperCase()
                      .split('')
                      .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
                      .join('')}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{webinar.country}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(webinar.created_at)}</p>
                  {hasDelayed && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium mt-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      Delayed
                    </span>
                  )}
                </div>
              </div>

              {/* Pipeline stepper */}
              <div className="flex items-center justify-center">
                <PipelineStepper tasks={tasks} />
              </div>

              {/* Progress */}
              <div className="w-20 flex flex-col items-center gap-1.5">
                <span className={cn(
                  'text-xs font-semibold tabular-nums',
                  hasDelayed ? 'text-red-600' : pct === 100 ? 'text-emerald-600' : 'text-slate-700'
                )}>
                  {completed}/9
                </span>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      hasDelayed ? 'bg-red-400' : pct === 100 ? 'bg-emerald-400' : 'bg-blue-400'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{pct}%</span>
              </div>

              {/* Actions */}
              <div className="w-24 text-right">
                <Link
                  href={`/module-b/webinars/${webinar.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
                >
                  Details →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="bg-slate-50/50 border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Legend</span>
        {[
          { dot: 'bg-emerald-500', label: 'Completed' },
          { dot: 'bg-blue-500',   label: 'In Progress' },
          { dot: 'bg-red-500',    label: 'Delayed' },
          { dot: 'bg-slate-200',  label: 'Not Started' },
        ].map(({ dot, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', dot)} />
            {label}
          </span>
        ))}
        <span className="text-xs text-slate-400 ml-auto">Hover over a dot to see task details</span>
      </div>
    </div>
  )
}
