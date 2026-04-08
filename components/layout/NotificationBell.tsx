'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, X, CheckCheck, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getStalePendingAlerts,
  dismissActivityAlert,
  dismissAllActivityAlerts,
  type PendingAlert,
} from '@/actions/notification.actions'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'

function getDaysPending(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
}

export function NotificationBell() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<PendingAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getStalePendingAlerts().then(data => {
      setAlerts(data)
      setLoading(false)
    })
  }, [])

  function handleDismiss(id: string) {
    setAlerts(prev => prev.filter(a => a.id !== id))
    startTransition(async () => {
      await dismissActivityAlert(id)
      router.refresh()
    })
  }

  function handleDismissAll() {
    setAlerts([])
    setOpen(false)
    startTransition(async () => {
      await dismissAllActivityAlerts()
      router.refresh()
    })
  }

  const count = alerts.length

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          aria-label={count > 0 ? `${count} pending alerts` : 'No pending alerts'}
        >
          <Bell className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-[9px] font-bold text-white leading-none">
                {count > 9 ? '9+' : count}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-sm font-semibold text-slate-900 tracking-tight">
              Pending Alerts
            </span>
            {count > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                {count}
              </span>
            )}
          </div>
          {count > 0 && (
            <button
              onClick={handleDismissAll}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="h-3 w-3" />
              Dismiss all
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
              <Bell className="h-6 w-6 opacity-30" />
              <p className="text-xs">No pending alerts</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {alerts.map(alert => {
                const daysPending = getDaysPending(alert.created_at)
                const typeLabel = ACTIVITY_TYPE_LABELS[alert.activity_type] ?? alert.activity_type.replace(/_/g, ' ')
                const zoneLabel = ZONAL_OFFICE_LABELS[alert.zonal_office] ?? alert.zonal_office

                return (
                  <li key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/50 group">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/module-a/activities/${alert.id}`}
                        onClick={() => setOpen(false)}
                        className="block"
                      >
                        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                          {typeLabel}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {alert.company_name} &middot; {zoneLabel}
                        </p>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-amber-600">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          Pending {daysPending} day{daysPending !== 1 ? 's' : ''}
                        </span>
                      </Link>
                    </div>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      disabled={isPending}
                      className="flex-shrink-0 mt-0.5 p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
                      aria-label="Dismiss alert"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {count > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
            <Link
              href="/module-a/activities"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              View all activities →
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
