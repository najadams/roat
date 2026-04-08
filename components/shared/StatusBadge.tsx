import { cn } from '@/lib/utils/cn'

const STATUS_STYLES: Record<string, string> = {
  completed:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  not_started: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
  delayed:     'bg-red-50 text-red-700 ring-1 ring-red-200',
  pending:     'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  cancelled:   'bg-slate-100 text-slate-400 ring-1 ring-slate-200 line-through',
}

const STATUS_LABELS: Record<string, string> = {
  completed:   'Completed',
  in_progress: 'In Progress',
  not_started: 'Not Started',
  delayed:     'Delayed',
  pending:     'Pending',
  cancelled:   'Cancelled',
}

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'
      )}
    >
      {label}
    </span>
  )
}
