'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteActivity } from '@/actions/activity.actions'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS, type Activity } from '@/types/activity.types'
import { formatDate } from '@/lib/utils/date-helpers'

interface ActivityTableProps {
  activities: Activity[]
  showZone?: boolean
  canDelete?: boolean
}

export function ActivityTable({ activities, showZone = false, canDelete = false }: ActivityTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    const result = await deleteActivity(deleteId)
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to delete')
    } else {
      toast.success('Activity deleted')
    }
    setDeleting(false)
    setDeleteId(null)
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-sm">No activities found.</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold tracking-wide text-slate-500 uppercase py-3">Date</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-500 uppercase py-3">Activity Type</TableHead>
              {showZone && (
                <TableHead className="text-xs font-semibold tracking-wide text-slate-500 uppercase py-3">Zone</TableHead>
              )}
              <TableHead className="text-xs font-semibold tracking-wide text-slate-500 uppercase py-3">Company</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-500 uppercase py-3">Location</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-500 uppercase py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-500 uppercase py-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map(activity => (
              <TableRow key={activity.id} className="border-slate-100 hover:bg-slate-50/50">
                <TableCell className="text-sm text-slate-600 py-3.5 whitespace-nowrap">
                  {formatDate(activity.date)}
                </TableCell>
                <TableCell className="text-sm font-medium text-slate-900 py-3.5">
                  {ACTIVITY_TYPE_LABELS[activity.activity_type] ?? activity.activity_type}
                </TableCell>
                {showZone && (
                  <TableCell className="text-sm text-slate-600 py-3.5">
                    {ZONAL_OFFICE_LABELS[activity.zonal_office] ?? activity.zonal_office}
                  </TableCell>
                )}
                <TableCell className="text-sm text-slate-600 py-3.5 max-w-[200px] truncate">
                  {activity.company_name}
                </TableCell>
                <TableCell className="text-sm text-slate-600 py-3.5">{activity.location}</TableCell>
                <TableCell className="py-3.5">
                  <StatusBadge status={activity.status} />
                </TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400 hover:text-slate-900">
                      <Link href={`/module-a/activities/${activity.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => setDeleteId(activity.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-slate-900">Delete Activity</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
