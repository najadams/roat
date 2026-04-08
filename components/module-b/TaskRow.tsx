'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { isTaskDelayed, getDelayDays } from '@/lib/utils/working-days'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { completeWebinarTask, updateTaskDeadline } from '@/actions/webinar.actions'
import { formatDate } from '@/lib/utils/date-helpers'
import { TASK_LABELS } from '@/types/webinar.types'
import { CheckCircle2, AlertTriangle, Clock, Pencil } from 'lucide-react'
import type { WebinarTask } from '@/types/webinar.types'

interface TaskRowProps {
  task: WebinarTask
  canComplete?: boolean
  canEditDeadline?: boolean
}

export function TaskRow({ task, canComplete = false, canEditDeadline = false }: TaskRowProps) {
  const [showComplete, setShowComplete] = useState(false)
  const [notes, setNotes] = useState('')
  const [completing, setCompleting] = useState(false)

  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const [newDeadline, setNewDeadline] = useState(
    task.deadline ? task.deadline.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [savingDeadline, setSavingDeadline] = useState(false)

  const delayed = task.status === 'in_progress' && isTaskDelayed(task.deadline)
  const delayDays = getDelayDays(task.deadline)
  const label = TASK_LABELS[task.task_name] ?? task.task_name
  const isEditable = canEditDeadline && task.status !== 'completed'

  async function handleComplete() {
    setCompleting(true)
    const result = await completeWebinarTask(task.id, notes || undefined)
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to complete task')
    } else {
      toast.success(`"${label}" marked as completed`)
      setShowComplete(false)
      setNotes('')
    }
    setCompleting(false)
  }

  async function handleSaveDeadline() {
    setSavingDeadline(true)
    const result = await updateTaskDeadline(task.id, newDeadline)
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update deadline')
    } else {
      toast.success('Deadline updated')
      setDeadlineOpen(false)
    }
    setSavingDeadline(false)
  }

  return (
    <>
      <tr
        className={cn(
          'border-b border-slate-100 transition-colors',
          task.status === 'completed' && 'bg-emerald-50/40',
          delayed && 'bg-red-50/50',
          task.status === 'not_started' && 'opacity-60 bg-slate-50/30',
        )}
      >
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono w-4">{task.task_order}.</span>
            <span className={cn(
              'text-sm font-medium',
              task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'
            )}>
              {label}
            </span>
          </div>
        </td>
        <td className="px-5 py-3.5 whitespace-nowrap">
          <StatusBadge status={delayed ? 'delayed' : task.status} />
        </td>
        <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
          {task.started_at ? formatDate(task.started_at) : '—'}
        </td>
        <td className="px-5 py-3.5 text-sm whitespace-nowrap">
          {isEditable ? (
            <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
              <PopoverTrigger asChild>
                <button className="group inline-flex items-center gap-1.5 rounded px-1 -ml-1 hover:bg-slate-100 transition-colors">
                  <span className={cn(
                    'font-medium',
                    delayed ? 'text-red-600' : task.deadline ? 'text-slate-600' : 'text-slate-400'
                  )}>
                    {task.deadline ? formatDate(task.deadline) : '—'}
                  </span>
                  <Pencil className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="start">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Edit Deadline</p>
                  <div className="space-y-1.5">
                    <Label htmlFor={`deadline-${task.id}`} className="text-xs text-slate-600">
                      New deadline date
                    </Label>
                    <input
                      id={`deadline-${task.id}`}
                      type="date"
                      value={newDeadline}
                      onChange={e => setNewDeadline(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-1"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setDeadlineOpen(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      size="sm"
                      onClick={handleSaveDeadline}
                      disabled={savingDeadline || !newDeadline}
                      className="h-7 px-3 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      {savingDeadline ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            task.deadline ? (
              <span className={cn(
                'font-medium',
                delayed ? 'text-red-600' : 'text-slate-600'
              )}>
                {formatDate(task.deadline)}
              </span>
            ) : '—'
          )}
        </td>
        <td className="px-5 py-3.5 whitespace-nowrap">
          {delayed && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">
              <AlertTriangle className="h-3 w-3" />
              {delayDays}d overdue
            </span>
          )}
          {task.status === 'completed' && task.completed_at && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              {formatDate(task.completed_at)}
            </span>
          )}
          {task.status === 'in_progress' && !delayed && task.deadline && (
            <span className="inline-flex items-center gap-1.5 text-xs text-blue-600">
              <Clock className="h-3 w-3" />
              On track
            </span>
          )}
        </td>
        <td className="px-5 py-3.5">
          {canComplete && task.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={() => setShowComplete(true)}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white px-3"
            >
              Mark Complete
            </Button>
          )}
        </td>
      </tr>

      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-base">Complete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Mark <strong>{label}</strong> as completed?
            </p>
            <div className="space-y-2">
              <Label htmlFor="task-notes" className="text-sm font-medium text-slate-700">
                Notes (optional)
              </Label>
              <Textarea
                id="task-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any relevant notes about this task completion..."
                rows={3}
                className="text-sm border-slate-200 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowComplete(false)}>Cancel</Button>
            <Button
              onClick={handleComplete}
              disabled={completing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              {completing ? 'Completing...' : 'Confirm Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
